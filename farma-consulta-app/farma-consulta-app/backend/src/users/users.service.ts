import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

function sanitize(user: any) {
  const { senha, ...rest } = user;
  return rest;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    return sanitize(user);
  }

  async updateProfile(email: string, dto: UpdateUserDto) {
    const data = Object.fromEntries(
      Object.entries(dto).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    );

    const user = await this.prisma.user.update({ where: { email }, data });
    return sanitize(user);
  }
}
