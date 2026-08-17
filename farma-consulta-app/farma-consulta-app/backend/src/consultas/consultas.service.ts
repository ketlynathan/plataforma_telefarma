import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConsultaStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { MailService } from '../mail/mail.service';
import { JaasService, VideoRoomSession } from './jaas.service';

const DURACAO_SLOT_MIN = 60;
const JANELA_ABERTURA_ANTES_MIN = 30;
const JANELA_ABERTURA_DEPOIS_MIN = 40;
const ANTECEDENCIA_AGENDAMENTO_MIN = 30;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toDate(dataIso: string, hora: string): Date {
  return new Date(`${dataIso}T${hora}:00`);
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class ConsultasService {
  private readonly logger = new Logger(ConsultasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jaas: JaasService,
  ) {}

  // ---------- Criação com validação de disponibilidade (transação) ----------

  async create(paciente: { nome: string; email: string }, dto: CreateConsultaDto) {
    const dataIso = dto.data;
    const dataConsulta = toDate(dataIso, '00:00');
    const inicioConsulta = toDate(dataIso, dto.hora);
    const agora = new Date();

    if (Number.isNaN(dataConsulta.getTime()) || Number.isNaN(inicioConsulta.getTime())) {
      throw new BadRequestException('Data ou horário inválido.');
    }
    if (!/^\d{2}:\d{2}$/.test(dto.hora) || toMinutes(dto.hora) >= 24 * 60) {
      throw new BadRequestException('Horário inválido.');
    }
    if (inicioConsulta.getTime() < agora.getTime() + ANTECEDENCIA_AGENDAMENTO_MIN * 60_000) {
      throw new BadRequestException(`O agendamento precisa ser feito com pelo menos ${ANTECEDENCIA_AGENDAMENTO_MIN} minutos de antecedência.`);
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Revalida o slot dentro da transação (evita corrida de reservas).
      const conflitantes = await tx.consulta.count({
        where: {
          farmaceuticoId: dto.farmaceuticoId,
          data: dataConsulta,
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

      const diaSemana = dataConsulta.getDay();
      const horaInicioMin = toMinutes(dto.hora);
      const horaFimMin = horaInicioMin + DURACAO_SLOT_MIN;
      const [faixas, bloqueios] = await Promise.all([
        tx.availability.findMany({
          where: { farmaceuticoId: dto.farmaceuticoId, diaSemana, ativo: true },
        }),
        tx.availabilityBlockout.findMany({
          where: {
            farmaceuticoId: dto.farmaceuticoId,
            inicio: { lt: new Date(inicioConsulta.getTime() + DURACAO_SLOT_MIN * 60_000) },
            fim: { gt: inicioConsulta },
          },
        }),
      ]);

      const dentroDaAgenda = faixas.some(
        (faixa) => horaInicioMin >= toMinutes(faixa.horaInicio) && horaFimMin <= toMinutes(faixa.horaFim),
      );
      if (!dentroDaAgenda) {
        throw new BadRequestException('O horário escolhido não está na agenda disponível do farmacêutico.');
      }
      if (bloqueios.length > 0) {
        throw new BadRequestException('O horário escolhido está bloqueado pelo farmacêutico.');
      }

      // 3. Gera sala persistente (slug + token) atrelada à consulta.
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

  /** Retorna a janela operacional da consulta: 30 min antes até 40 min depois. */
  private getJanelaAtendimento(consulta: { data: Date; hora: string }) {
    const dataIso = formatIsoDate(consulta.data);
    const inicio = toDate(dataIso, consulta.hora);
    return {
      inicio,
      abreEm: new Date(inicio.getTime() - JANELA_ABERTURA_ANTES_MIN * 60_000),
      encerraEm: new Date(inicio.getTime() + JANELA_ABERTURA_DEPOIS_MIN * 60_000),
    };
  }

  private validarJanelaAtendimento(consulta: { data: Date; hora: string; status: ConsultaStatus }) {
    const janela = this.getJanelaAtendimento(consulta);
    const agora = new Date();
    if (agora < janela.abreEm) {
      throw new BadRequestException(`A sala poderá ser aberta a partir de ${janela.abreEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`);
    }
    if (agora > janela.encerraEm && consulta.status !== ConsultaStatus.EM_ATENDIMENTO) {
      throw new BadRequestException('A janela para iniciar este atendimento terminou.');
    }
    return janela;
  }

  private async criarSessaoSala(
    consulta: { roomSlug: string; status: ConsultaStatus; farmaceuticoEntrouEm: Date | null; clienteEntrouEm: Date | null; toleranciaMin: number },
    user: { id: string; nome?: string; email?: string; tipo: string },
  ) {
    const session: VideoRoomSession = this.jaas.createSession(
      consulta.roomSlug,
      { id: user.id, nome: user.nome, email: user.email },
      user.tipo === 'farmaceutico',
    );
    return {
      ...session,
      roomSlug: consulta.roomSlug,
      status: consulta.status,
      farmaceuticoEntrouEm: consulta.farmaceuticoEntrouEm,
      clienteEntrouEm: consulta.clienteEntrouEm,
      toleranciaMin: consulta.toleranciaMin,
    };
  }

  /**
   * Retorna a mesma sala persistida para os dois participantes.
   * O farmacêutico pode abri-la 30 minutos antes até 40 minutos depois do horário.
   */
  async getRoom(id: string, user: { id: string; nome?: string; email?: string; tipo: string }) {
    let consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: { farmaceutico: { select: { id: true } } },
    });
    if (!consulta) throw new BadRequestException('Consulta não encontrada.');

    const isCliente = user.tipo === 'cliente' && user.email === consulta.pacienteEmail;
    const isFarmaceutico = user.tipo === 'farmaceutico' && consulta.farmaceutico?.id === user.id;
    if (!isCliente && !isFarmaceutico) throw new ForbiddenException('Você não tem acesso a esta consulta.');
    if (new Set<ConsultaStatus>([ConsultaStatus.CANCELADA, ConsultaStatus.CONCLUIDA, ConsultaStatus.FARMACEUTICO_AUSENTE]).has(consulta.status)) {
      throw new BadRequestException('Esta consulta não está disponível para entrada.');
    }

    const janela = this.validarJanelaAtendimento(consulta);
    if (isCliente && !consulta.farmaceuticoEntrouEm) {
      throw new BadRequestException('Aguardando o farmacêutico abrir a sala. Você pode enviar uma mensagem enquanto aguarda.');
    }
    if (isCliente && new Date() > janela.encerraEm && consulta.status !== ConsultaStatus.EM_ATENDIMENTO) {
      throw new BadRequestException('A janela para entrada neste atendimento terminou.');
    }

    const agoraEntrada = new Date();
    const updateData: any = {};
    let roomSlug = consulta.roomSlug;
    let roomToken = consulta.roomToken;
    if (!roomSlug) {
      const dataIso = formatIsoDate(consulta.data);
      roomSlug = `farma-${dataIso.replace(/-/g, '')}-${consulta.hora.replace(':', '')}-${crypto.randomBytes(6).toString('hex')}`;
      updateData.roomSlug = roomSlug;
    }
    if (!roomToken) updateData.roomToken = crypto.randomBytes(24).toString('hex');
    if (isFarmaceutico && !consulta.farmaceuticoEntrouEm) {
      updateData.farmaceuticoEntrouEm = agoraEntrada;
      if (new Set<ConsultaStatus>([ConsultaStatus.AGENDADA, ConsultaStatus.CONFIRMADA, ConsultaStatus.CLIENTE_AGUARDANDO]).has(consulta.status)) {
        updateData.status = ConsultaStatus.FARMACEUTICO_AGUARDANDO;
      }
    }

    if (Object.keys(updateData).length > 0) {
      consulta = await this.prisma.consulta.update({
        where: { id },
        data: updateData,
        include: { farmaceutico: { select: { id: true } } },
      });
    }

    return this.criarSessaoSala(consulta as any, user);
  }

  /** Marca a entrada efetiva no vídeo; o cliente só passa a Em atendimento após o evento de entrada do JaaS. */
  async enterRoom(id: string, user: { id: string; nome?: string; email?: string; tipo: string }) {
    const consulta = await this.getConsultaOrThrow(id);
    const isCliente = user.tipo === 'cliente' && user.email === consulta.pacienteEmail;
    const isFarmaceutico = user.tipo === 'farmaceutico' && consulta.farmaceutico?.id === user.id;
    if (!isCliente && !isFarmaceutico) throw new ForbiddenException('Você não tem acesso a esta consulta.');
    this.validarJanelaAtendimento(consulta);
    if (isCliente && !consulta.farmaceuticoEntrouEm) throw new BadRequestException('O farmacêutico ainda não abriu a sala.');

    const updateData: any = {};
    if (isCliente && !consulta.clienteEntrouEm) {
      updateData.clienteEntrouEm = new Date();
      updateData.status = ConsultaStatus.EM_ATENDIMENTO;
    }
    if (isFarmaceutico && !consulta.farmaceuticoEntrouEm) {
      updateData.farmaceuticoEntrouEm = new Date();
      updateData.status = ConsultaStatus.FARMACEUTICO_AGUARDANDO;
    }
    if (Object.keys(updateData).length === 0) return consulta;
    return this.prisma.consulta.update({
      where: { id },
      data: updateData,
      include: { farmaceutico: { select: { id: true, nome: true, tratamento: true, crf: true } } },
    });
  }

  /** Compatibilidade com clientes antigos: o botão de sala extra agora retorna a mesma sala persistida. */
  async newRoom(id: string, user: { id: string; nome?: string; email?: string; tipo: string }) {
    if (user.tipo !== 'farmaceutico') throw new ForbiddenException('Apenas o farmacêutico pode abrir a sala.');
    return this.getRoom(id, user);
  }

  async fecharSala(id: string, user: { id: string; tipo: string }) {
    if (user.tipo !== 'farmaceutico') throw new ForbiddenException('Apenas o farmacêutico pode fechar a sala.');
    const consulta = await this.getConsultaOrThrow(id);
    if (consulta.farmaceutico?.id !== user.id) throw new ForbiddenException('Esta consulta não pertence a você.');

    const status = consulta.status === ConsultaStatus.EM_ATENDIMENTO
      ? ConsultaStatus.CONCLUIDA
      : new Set<ConsultaStatus>([
          ConsultaStatus.AGENDADA,
          ConsultaStatus.CONFIRMADA,
          ConsultaStatus.CLIENTE_AGUARDANDO,
          ConsultaStatus.FARMACEUTICO_AGUARDANDO,
        ]).has(consulta.status)
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
