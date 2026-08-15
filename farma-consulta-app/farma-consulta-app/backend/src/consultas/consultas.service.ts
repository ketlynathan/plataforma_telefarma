import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConsultaStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';

const DURACAO_SLOT_MIN = 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class ConsultasService {
  private readonly logger = new Logger(ConsultasService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- Criação com validação de disponibilidade (transação) ----------

  async create(paciente: { nome: string; email: string }, dto: CreateConsultaDto) {
    const dataIso = dto.data;

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Revalida o slot dentro da transação (evita corrida de reservas).
      const conflitantes = await tx.consulta.count({
        where: {
          farmaceuticoId: dto.farmaceuticoId,
          data: new Date(`${dataIso}T00:00:00`),
          hora: dto.hora,
          status: { not: ConsultaStatus.CANCELADA },
        },
      });
      if (conflitantes > 0) {
        throw new BadRequestException('Este horário já está reservado.');
      }

      // 2. Confirma que o farmacêutico existe, está ativo e é farmacêutico.
      const farmaceutico = await tx.user.findUnique({
        where: { id: dto.farmaceuticoId },
      });
      if (!farmaceutico || farmaceutico.tipo !== 'farmaceutico' || !farmaceutico.ativo) {
        throw new BadRequestException('Farmacêutico indisponível.');
      }

      // 3. Gera sala Jitsi persistente (slug + token) atrelada à consulta.
      const roomSlug = `farma-${dataIso.replace(/-/g, '')}-${dto.hora.replace(':', '')}-${dto.farmaceuticoId.slice(0, 8)}`;
      const roomToken = crypto.randomBytes(24).toString('hex');

      return tx.consulta.create({
        data: {
          pacienteNome: paciente.nome,
          pacienteEmail: paciente.email,
          data: new Date(`${dataIso}T00:00:00`),
          hora: dto.hora,
          status: ConsultaStatus.AGENDADA,
          observacoes: dto.observacoes?.trim() ?? '',
          farmaceuticoId: dto.farmaceuticoId,
          roomSlug,
          roomToken,
        },
        include: { farmaceutico: { select: { id: true, nome: true } } },
      });
    });

    this.logger.log(`Consulta criada para ${dataIso} ${dto.hora} com ${dto.farmaceuticoId}`);
    return resultado;
  }

  // ---------- Consultas do cliente ----------

  findByEmail(email: string) {
    return this.prisma.consulta.findMany({
      where: { pacienteEmail: email },
      include: { farmaceutico: { select: { id: true, nome: true } } },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  // ---------- Consultas do farmacêutico (isoladas, item 14) ----------

  findByFarmaceutico(farmaceuticoId: string) {
    return this.prisma.consulta.findMany({
      where: { farmaceuticoId },
      include: { farmaceutico: { select: { id: true, nome: true } } },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  // Equivalente antigo a findAll() — mantido para compatibilidade interna.
  findAll() {
    return this.prisma.consulta.findMany({
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  listUniquePatients() {
    return this.prisma.consulta.findMany({
      select: { pacienteNome: true, pacienteEmail: true },
      distinct: ['pacienteEmail'],
      orderBy: { pacienteNome: 'asc' },
    });
  }

  // ---------- Sala de vídeo (item 4) ----------

  private async getConsultaOrThrow(id: string) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: { farmaceutico: { select: { id: true } } },
    });
    if (!consulta) {
      throw new BadRequestException('Consulta não encontrada.');
    }
    return consulta;
  }

  /**
   * Retorna/gera a sala persistida da consulta.
   * Só o cliente dono ou o farmacêutico da consulta podem entrar.
   */
  async getRoom(id: string, user: { id: string; email?: string; tipo: string }) {
    const consulta = await this.getConsultaOrThrow(id);

    const isCliente = user.tipo === 'cliente' && user.email === consulta.pacienteEmail;
    const isFarmaceutico =
      user.tipo === 'farmaceutico' && consulta.farmaceutico?.id === user.id;

    if (!isCliente && !isFarmaceutico) {
      throw new ForbiddenException('Você não tem acesso a esta consulta.');
    }

    let roomSlug = consulta.roomSlug;
    let roomToken = consulta.roomToken;

    if (!roomSlug || !roomToken) {
      roomSlug = `farma-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(6).toString('hex')}`;
      roomToken = crypto.randomBytes(24).toString('hex');
      await this.prisma.consulta.update({
        where: { id },
        data: { roomSlug, roomToken },
      });
    }

    return {
      roomSlug,
      roomUrl: `https://meet.jit.si/${roomSlug}`,
      status: consulta.status,
    };
  }

  /** Abre uma nova sala mantendo o vínculo com a consulta original (item 12). */
  async newRoom(id: string, user: { id: string; tipo: string }) {
    if (user.tipo !== 'farmaceutico') {
      throw new ForbiddenException('Apenas o farmacêutico pode abrir nova sala.');
    }
    const consulta = await this.getConsultaOrThrow(id);
    if (consulta.farmaceutico?.id !== user.id) {
      throw new ForbiddenException('Esta consulta não pertence a você.');
    }

    const roomSlug = `farma-${crypto.randomBytes(6).toString('hex')}`;
    const roomToken = crypto.randomBytes(24).toString('hex');

    await this.prisma.consulta.update({
      where: { id },
      data: { roomSlug, roomToken },
    });

    return { roomSlug, roomUrl: `https://meet.jit.si/${roomSlug}` };
  }

  // ---------- Transições de status (item 13) ----------

  async updateStatus(id: string, user: { id: string; email?: string; tipo: string }, status: ConsultaStatus) {
    const consulta = await this.getConsultaOrThrow(id);

    if (user.tipo === 'cliente' && user.email !== consulta.pacienteEmail) {
      throw new ForbiddenException('Esta consulta não pertence a você.');
    }
    if (user.tipo === 'farmaceutico' && consulta.farmaceutico?.id !== user.id) {
      throw new ForbiddenException('Esta consulta não pertence a você.');
    }

    const atualizado = await this.prisma.consulta.update({
      where: { id },
      data: { status },
      include: { farmaceutico: { select: { id: true, nome: true } } },
    });

    this.logger.log(`Status da consulta ${id} → ${status}`);
    return atualizado;
  }
}
