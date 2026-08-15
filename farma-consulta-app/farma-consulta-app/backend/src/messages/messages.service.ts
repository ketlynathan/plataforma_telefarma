import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConsultaStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Verifica posse da consulta e devolve os dois participantes. */
  private async participants(
    consultaId: string,
    user: { id: string; email?: string; tipo: string },
  ) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      include: { farmaceutico: { select: { id: true, nome: true } } },
    });

    if (!consulta) {
      throw new BadRequestException('Consulta não encontrada.');
    }

    let outroUsuarioId: string | undefined;

    if (user.tipo === 'cliente' && user.email === consulta.pacienteEmail) {
      outroUsuarioId = consulta.farmaceutico?.id;
    } else if (user.tipo === 'farmaceutico' && consulta.farmaceutico?.id === user.id) {
      const cliente = await this.prisma.user.findUnique({
        where: { email: consulta.pacienteEmail },
      });
      outroUsuarioId = cliente?.id;
    } else {
      throw new ForbiddenException('Você não tem acesso a esta consulta.');
    }

    return { consulta, outroUsuarioId };
  }

  async send(consultaId: string, user: { id: string; email?: string; tipo: string }, texto: string) {
    const { consulta, outroUsuarioId } = await this.participants(consultaId, user);

    if (!outroUsuarioId) {
      throw new BadRequestException('Consulta sem interlocutor definido.');
    }

    const mensagem = await this.prisma.message.create({
      data: {
        consultaId,
        remetenteId: user.id,
        destinatarioId: outroUsuarioId,
        texto: texto.trim(),
      },
    });

    this.logger.log(`Mensagem enviada na consulta ${consultaId} por ${user.id}`);
    return mensagem;
  }

  /** Histórico paginado com marcação automática de leitura das mensagens recebidas. */
  async list(
    consultaId: string,
    user: { id: string; email?: string; tipo: string },
    take = 50,
    beforeId?: string,
  ) {
    const { outroUsuarioId } = await this.participants(consultaId, user);

    const cursor: Prisma.MessageWhereInput = {
      consultaId,
      ...(beforeId ? { id: { lt: beforeId } } : {}),
    };

    const mensagens = await this.prisma.message.findMany({
      where: cursor,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
    });

    const hasNext = mensagens.length > take;
    const page = mensagens.slice(0, take).reverse();

    // Marca como lidas as mensagens recebidas pelo usuário.
    const naoLidas = page.filter((m) => m.destinatarioId === user.id && !m.lida);
    if (naoLidas.length > 0) {
      await this.prisma.message.updateMany({
        where: { id: { in: naoLidas.map((m) => m.id) } },
        data: { lida: true },
      });
    }

    return {
      mensagens: page.map((m) => ({ ...m, remetenteMe: m.remetenteId === user.id })),
      nextCursor: hasNext && page.length > 0 ? page[0].id : null,
    };
  }

  /** Contagem de mensagens não lidas para o badge de notificação. */
  async unreadCount(user: { id: string }) {
    return this.prisma.message.count({
      where: { destinatarioId: user.id, lida: false },
    });
  }

  /** Último status da consulta junto com as mensagens mais recentes (polling, item 21). */
  async status(consultaId: string, user: { id: string; email?: string; tipo: string }) {
    const { consulta, outroUsuarioId } = await this.participants(consultaId, user);

    const naoLidas = await this.prisma.message.count({
      where: { consultaId, destinatarioId: user.id, lida: false },
    });

    const ultimaMensagem = await this.prisma.message.findFirst({
      where: { consultaId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, texto: true, remetenteId: true, createdAt: true },
    });

    return {
      status: consulta.status,
      roomSlug: consulta.roomSlug,
      outroUsuarioNome:
        user.tipo === 'cliente'
          ? consulta.farmaceutico?.nome
          : await this.prisma.user
              .findUnique({ where: { email: consulta.pacienteEmail }, select: { nome: true } })
              .then((u) => u?.nome),
      naoLidas,
      ultimaMensagem: ultimaMensagem
        ? { ...ultimaMensagem, remetenteMe: ultimaMensagem.remetenteId === user.id }
        : null,
    };
  }
}
