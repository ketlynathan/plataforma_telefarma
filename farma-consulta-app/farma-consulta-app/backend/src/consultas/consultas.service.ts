import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConsultaStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { MailService } from '../mail/mail.service';

const DURACAO_SLOT_MIN = 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class ConsultasService {
  private readonly logger = new Logger(ConsultasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

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
        include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
      });
    });

    const farmaceutico = await this.prisma.user.findUnique({
      where: { id: dto.farmaceuticoId },
      select: { nome: true, email: true },
    });
    if (farmaceutico?.email) {
      await this.mail.sendConsultationBooked(farmaceutico.email, farmaceutico.nome, {
        pacienteNome: paciente.nome,
        data: dataIso,
        hora: dto.hora,
        observacoes: dto.observacoes,
      });
    }

    this.logger.log(`Consulta criada para ${dataIso} ${dto.hora} com ${dto.farmaceuticoId}`);
    return resultado;
  }

  // ---------- Consultas do cliente ----------

  findByEmail(email: string) {
    return this.prisma.consulta.findMany({
      where: { pacienteEmail: email },
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    });
  }

  // ---------- Consultas do farmacêutico (isoladas, item 14) ----------

  findByFarmaceutico(farmaceuticoId: string) {
    return this.prisma.consulta.findMany({
      where: { farmaceuticoId },
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
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
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: { farmaceutico: { select: { id: true } } },
    });
    if (!consulta) throw new BadRequestException('Consulta não encontrada.');

    const isCliente = user.tipo === 'cliente' && user.email === consulta.pacienteEmail;
    const isFarmaceutico =
      user.tipo === 'farmaceutico' && consulta.farmaceutico?.id === user.id;

    if (!isCliente && !isFarmaceutico) {
      throw new ForbiddenException('Você não tem acesso a esta consulta.');
    }

    if (consulta.status === ConsultaStatus.CANCELADA || consulta.status === ConsultaStatus.CONCLUIDA) {
      throw new BadRequestException('Esta consulta não está disponível para entrada.');
    }

    const dataIso = consulta.data.toISOString().slice(0, 10);
    const inicio = new Date(`${dataIso}T${consulta.hora}:00`);
    const limiteAtraso = new Date(inicio.getTime() + consulta.toleranciaMin * 60_000);
    const agora = new Date();

    if (isCliente) {
      if (agora < inicio) {
        throw new BadRequestException(`A sala estará disponível a partir de ${consulta.hora}.`);
      }
      if (!consulta.farmaceuticoEntrouEm) {
        throw new BadRequestException('Aguardando o farmacêutico entrar na sala. Você pode enviar uma mensagem enquanto aguarda.');
      }
      if (agora > limiteAtraso && consulta.status !== ConsultaStatus.EM_ATENDIMENTO) {
        throw new BadRequestException('O prazo de tolerância terminou. Envie uma mensagem ao farmacêutico para solicitar o atendimento.');
      }
    }

    let roomSlug = consulta.roomSlug;
    let roomToken = consulta.roomToken;

    const agoraEntrada = new Date();
    const updateData: any = {};
    if (isFarmaceutico && !consulta.farmaceuticoEntrouEm) {
      updateData.farmaceuticoEntrouEm = agoraEntrada;
      if (consulta.status === ConsultaStatus.AGENDADA || consulta.status === ConsultaStatus.CONFIRMADA) {
        updateData.status = ConsultaStatus.FARMACEUTICO_AGUARDANDO;
      }
    }
    if (isCliente && !consulta.clienteEntrouEm) {
      updateData.clienteEntrouEm = agoraEntrada;
      updateData.status = ConsultaStatus.EM_ATENDIMENTO;
    }

    if (!roomSlug || !roomToken || Object.keys(updateData).length > 0) {
      roomSlug = roomSlug ?? `farma-${dataIso.replace(/-/g, '')}-${crypto.randomBytes(6).toString('hex')}`;
      roomToken = roomToken ?? crypto.randomBytes(24).toString('hex');
      await this.prisma.consulta.update({
        where: { id },
        data: { roomSlug, roomToken, ...updateData },
      });
    }

    return {
      roomSlug,
      roomUrl: `https://meet.jit.si/${roomSlug}`,
      status: updateData.status ?? consulta.status,
      farmaceuticoEntrouEm: isFarmaceutico ? agoraEntrada : consulta.farmaceuticoEntrouEm,
      clienteEntrouEm: isCliente ? agoraEntrada : consulta.clienteEntrouEm,
      toleranciaMin: consulta.toleranciaMin,
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
    if (consulta.status === ConsultaStatus.CANCELADA || consulta.status === ConsultaStatus.CONCLUIDA) {
      throw new ConflictException('Não é possível abrir uma sala extra para uma consulta encerrada.');
    }
    const roomSlug = `farma-${crypto.randomBytes(6).toString('hex')}`;
    const roomToken = crypto.randomBytes(24).toString('hex');

    const statusAtual = consulta.status === ConsultaStatus.EM_ATENDIMENTO
      ? ConsultaStatus.EM_ATENDIMENTO
      : ConsultaStatus.FARMACEUTICO_AGUARDANDO;

    await this.prisma.consulta.update({
      where: { id },
      data: {
        roomSlug,
        roomToken,
        farmaceuticoEntrouEm: consulta.farmaceuticoEntrouEm ?? new Date(),
        status: statusAtual,
      },
    });

    return { roomSlug, roomUrl: `https://meet.jit.si/${roomSlug}`, status: statusAtual };
  }

  async fecharSala(id: string, user: { id: string; tipo: string }) {
    if (user.tipo !== 'farmaceutico') throw new ForbiddenException('Apenas o farmacêutico pode fechar a sala.');
    const consulta = await this.getConsultaOrThrow(id);
    if (consulta.farmaceutico?.id !== user.id) throw new ForbiddenException('Esta consulta não pertence a você.');

    const status = consulta.status === ConsultaStatus.EM_ATENDIMENTO
      ? ConsultaStatus.CONCLUIDA
      : consulta.status === ConsultaStatus.FARMACEUTICO_AGUARDANDO
        ? ConsultaStatus.FARMACEUTICO_AUSENTE
        : consulta.status;

    return this.prisma.consulta.update({
      where: { id },
      data: { status },
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
    });
  }

  async admitirAtrasado(id: string, user: { id: string; tipo: string }) {
    if (user.tipo !== 'farmaceutico') throw new ForbiddenException('Apenas o farmacêutico pode admitir um paciente atrasado.');
    const consulta = await this.getConsultaOrThrow(id);
    if (consulta.farmaceutico?.id !== user.id) throw new ForbiddenException('Esta consulta não pertence a você.');
    if (!consulta.farmaceuticoEntrouEm) throw new BadRequestException('Entre na sala antes de admitir o paciente.');
    return this.prisma.consulta.update({
      where: { id },
      data: { status: ConsultaStatus.EM_ATENDIMENTO },
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
    });
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

    const estadosDeEspera: ConsultaStatus[] = [
      ConsultaStatus.AGENDADA,
      ConsultaStatus.CONFIRMADA,
      ConsultaStatus.CLIENTE_AGUARDANDO,
      ConsultaStatus.FARMACEUTICO_AGUARDANDO,
    ];

    if (consulta.status === ConsultaStatus.EM_ATENDIMENTO && estadosDeEspera.includes(status)) {
      throw new ConflictException('A consulta já está em atendimento e não pode voltar para um estado de espera.');
    }

    const atualizado = await this.prisma.consulta.update({
      where: { id },
      data: { status },
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
    });

    this.logger.log(`Status da consulta ${id} → ${status}`);
    return atualizado;
  }
}
