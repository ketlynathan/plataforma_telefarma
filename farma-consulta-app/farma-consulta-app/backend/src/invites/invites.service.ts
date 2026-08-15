import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const EXPIRACAO_DIAS = 7;

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Cria convite e envia o e-mail. */
  async create(email: string, criadoPor: string, criadorNome: string) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiraEm = new Date(Date.now() + EXPIRACAO_DIAS * 24 * 60 * 60 * 1000);

    const existeConta = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existeConta && existeConta.tipo === 'farmaceutico') {
      throw new ConflictException('Este e-mail já possui uma conta de farmacêutico.');
    }

    await this.prisma.invite.create({
      data: { email: email.trim().toLowerCase(), token, criadoPor, expiraEm },
    });

    await this.mail.sendInvite(email, token, criadorNome);
    this.logger.log(`Convite criado para ${email} por ${criadorNome}`);

    return { ok: true, mensagem: 'Convite enviado por e-mail.' };
  }

  /** Valida o token e retorna o e-mail pré-preenchido. */
  async getInvite(token: string) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado.');
    if (invite.usado) throw new BadRequestException('Este convite já foi utilizado.');
    if (invite.expiraEm < new Date()) throw new BadRequestException('Este convite expirou.');

    return { email: invite.email, criadoPor: invite.criadoPor, expiraEm: invite.expiraEm };
  }

  /** Completa o cadastro do farmacêutico convidado. */
  async complete(token: string, dto: { nome: string; senha: string; telefone?: string }) {
    const invite = await this.prisma.invite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado.');
    if (invite.usado) throw new BadRequestException('Este convite já foi utilizado.');
    if (invite.expiraEm < new Date()) throw new BadRequestException('Este convite expirou.');

    const existente = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    const hashed = await bcrypt.hash(dto.senha, 10);
    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome.trim(),
        email: invite.email,
        senha: hashed,
        tipo: 'farmaceutico',
        telefone: dto.telefone?.trim() ?? '',
        convidadoPor: invite.criadoPor,
      },
    });

    await this.prisma.invite.update({ where: { id: invite.id }, data: { usado: true } });
    this.logger.log(`Farmacêutico cadastrado via convite: ${invite.email}`);

    const { senha, ...resto } = user;
    return resto;
  }
}
