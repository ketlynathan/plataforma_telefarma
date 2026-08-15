import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const CODIGO_MIN_DIGITOS = 6;
const EXPIRACAO_MINUTOS = 15;
const MAX_TENTATIVAS = 5;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Gera código de 6 dígitos, armazena o hash e dispara o e-mail.
   * Sempre retorna 200 para não revelar se o e-mail existe.
   */
  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    if (user) {
      const codigo = Array.from({ length: CODIGO_MIN_DIGITOS }, () =>
        Math.floor(Math.random() * 10),
      ).join('');

      const expiraEm = new Date(Date.now() + EXPIRACAO_MINUTOS * 60_000);

      // Marca tokens antigos como usados (um código ativo por vez).
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usado: false },
        data: { usado: true },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          codigo: await bcrypt.hash(codigo, 10),
          expiraEm,
        },
      });

      await this.mail.sendResetCode(user.email, codigo);
      this.logger.log(`Reset solicitado para ${user.email}`);
    }

    // Sempre 200.
    return { ok: true, mensagem: 'Se a conta existir, enviamos um código para o e-mail.' };
  }

  private async findValidToken(email: string, codigo: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return null;

    const token = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usado: false,
        expiraEm: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) return null;

    const matches = await bcrypt.compare(codigo, token.codigo);
    if (!matches) {
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { tentativas: { increment: 1 } },
      });
      return null;
    }

    return { user, token };
  }

  /** Verifica o código e marca o token como usado na verificação. */
  async verify(email: string, codigo: string) {
    const found = await this.findValidToken(email, codigo);
    if (!found) {
      const user = await this.prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (user) {
        const bloqueado = await this.prisma.passwordResetToken.count({
          where: { userId: user.id, usado: false, tentativas: { gte: MAX_TENTATIVAS } },
        });
        if (bloqueado > 0) {
          throw new BadRequestException('Muitas tentativas incorretas. Solicite um novo código.');
        }
      }
      throw new BadRequestException('Código inválido ou expirado.');
    }

    await this.prisma.passwordResetToken.update({
      where: { id: found.token.id },
      data: { usado: true },
    });

    // Emite token de sessão curto para confirmar a nova senha (válido por 10 min).
    const jwt = await import('@nestjs/jwt');
    const jwtService = new jwt.JwtService({
      secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });
    const resetToken = await jwtService.signAsync(
      { sub: found.user.id, purpose: 'reset' },
      { expiresIn: '10m' },
    );

    return { ok: true, resetToken };
  }

  /** Confirma a nova senha usando o resetToken da verificação. */
  async confirm(email: string, codigo: string, novaSenha: string, resetToken: string) {
    const jwt = await import('@nestjs/jwt');
    const jwtService = new jwt.JwtService({
      secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret',
    });

    let payload: any;
    try {
      payload = await jwtService.verifyAsync(resetToken);
    } catch {
      throw new BadRequestException('Sessão de recuperação expirada. Solicite um novo código.');
    }

    if (payload.purpose !== 'reset') {
      throw new BadRequestException('Token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, email: email.trim().toLowerCase() },
    });
    if (!user) throw new NotFoundException('Conta não encontrada.');

    const valid = await this.findValidToken(email, codigo);
    if (!valid || valid.user.id !== user.id) {
      throw new BadRequestException('Código inválido ou expirado.');
    }

    const hashed = await bcrypt.hash(novaSenha, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { senha: hashed } });
    await this.prisma.passwordResetToken.update({
      where: { id: valid.token.id },
      data: { usado: true },
    });

    return { ok: true, mensagem: 'Senha atualizada com sucesso.' };
  }
}
