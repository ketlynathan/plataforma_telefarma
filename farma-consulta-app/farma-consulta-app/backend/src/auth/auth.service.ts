import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

function sanitize(user: any) {
  const { senha, ...rest } = user;
  return rest;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ja existe uma conta cadastrada com esse email.');
    }

    const hashed = await bcrypt.hash(dto.senha, 10);
    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome.trim(),
        email: dto.email.trim(),
        senha: hashed,
        tipo: dto.tipo ?? 'cliente',
        telefone: dto.telefone?.trim() ?? '',
      },
    });

    return sanitize(user);
  }

  async validateUser(email: string, senha: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim() } });
    if (!user) return null;
    const matches = await bcrypt.compare(senha, user.senha);
    if (!matches) return null;
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.senha);
    if (!user) {
      throw new UnauthorizedException('Email ou senha invalidos.');
    }

    const payload = { sub: user.id, email: user.email, tipo: user.tipo };
    const access_token = await this.jwt.signAsync(payload);

    return { access_token, user: sanitize(user) };
  }
}
