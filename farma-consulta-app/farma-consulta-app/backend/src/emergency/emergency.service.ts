import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { EmergencyStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { JaasService, VideoRoomSession } from '../consultas/jaas.service';

const EM_ABERTO: EmergencyStatus = EmergencyStatus.EM_ABERTO;
const ATENDIDA: EmergencyStatus = EmergencyStatus.ATENDIDA;
const EXPIRADA: EmergencyStatus = EmergencyStatus.EXPIRADA;
const CANCELADA: EmergencyStatus = EmergencyStatus.CANCELADA;
const ENCERRADA: EmergencyStatus = EmergencyStatus.ENCERRADA;
const FARMACEUTICO_AGUARDANDO: EmergencyStatus = EmergencyStatus.FARMACEUTICO_AGUARDANDO;
const EM_ATENDIMENTO: EmergencyStatus = EmergencyStatus.EM_ATENDIMENTO;
const CONCLUIDA: EmergencyStatus = EmergencyStatus.CONCLUIDA;
const FALHA_ATENDIMENTO: EmergencyStatus = EmergencyStatus.FALHA_ATENDIMENTO;

/** Tempo máximo de atendimento de emergência (30 minutos). */
const DURACAO_MAX_MIN = 30;

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jaas: JaasService,
  ) {}

  // ---------- Cliente: solicitar ----------

  async solicitar(clienteId: string) {
    const aberta = await this.prisma.emergencyRequest.findFirst({
      where: { clienteId, status: EM_ABERTO },
    });
    if (aberta) {
      throw new ConflictException('Você já possui uma solicitação de emergência em aberto.');
    }

    const cliente = await this.prisma.user.findUnique({
      where: { id: clienteId },
      select: { nome: true },
    });

    // Emergência não depende do indicador de disponibilidade: todos os farmacêuticos
    // ativos são avisados e decidem individualmente se conseguem assumir a chamada.
    const farmaceuticos = await this.prisma.user.findMany({
      where: { tipo: 'farmaceutico', ativo: true, email: { not: '' } },
      select: { nome: true, email: true },
    });

    const solicitacao = await this.prisma.emergencyRequest.create({
      data: { clienteId, status: EM_ABERTO },
    });

    await Promise.allSettled(
      farmaceuticos.map((farm) =>
        this.mail.sendEmergencyAlert(farm.email, farm.nome, {
          pacienteNome: cliente?.nome ?? 'Paciente',
          criadoEm: solicitacao.criadoEm.toLocaleString('pt-BR'),
        }),
      ),
    );

    this.logger.log(`Emergência solicitada pelo cliente ${clienteId}; ${farmaceuticos.length} farmacêutico(s) notificado(s)`);
    return solicitacao;
  }

  // ---------- Cliente: acompanhar ----------

  async minha(clienteId: string) {
    const request = await this.prisma.emergencyRequest.findFirst({
      where: { clienteId },
      orderBy: { criadoEm: 'desc' },
      include: { farmaceutico: { select: { id: true, nome: true } } },
    });
    if (!request) return null;
    const room = request.roomSlug
      ? this.jaas.createSession(request.roomSlug, { id: clienteId }, false)
      : null;
    return {
      ...request,
      roomUrl: room?.roomUrl ?? null,
      salaPronta: Boolean(request.salaAbertaEm && request.roomSlug),
      notificacaoPaciente: request.status === FARMACEUTICO_AGUARDANDO
        ? 'O farmacêutico abriu a sala. Você já pode entrar na chamada.'
        : undefined,
    };
  }

  private async getRequestOrThrow(requestId: string) {
    const request = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: {
        cliente: { select: { id: true, nome: true, email: true } },
        farmaceutico: { select: { id: true, nome: true, email: true } },
      },
    });
    if (!request) throw new BadRequestException('Solicitação não encontrada.');
    return request;
  }

  private async validarParticipante(requestId: string, user: { id: string; tipo: string; nome?: string; email?: string }) {
    const request = await this.getRequestOrThrow(requestId);
    const cliente = user.tipo === 'cliente' && request.clienteId === user.id;
    const farmaceutico = user.tipo === 'farmaceutico' && request.farmaceuticoId === user.id;
    if (!cliente && !farmaceutico) throw new ForbiddenException('Você não tem acesso a esta emergência.');
    return { request, cliente, farmaceutico };
  }

  async sala(requestId: string, user: { id: string; tipo: string; nome?: string; email?: string }) {
    const { request, cliente, farmaceutico } = await this.validarParticipante(requestId, user);
    if (!request.roomSlug || !request.salaAbertaEm) {
      throw new BadRequestException('O farmacêutico ainda não abriu a sala.');
    }
    if ([EXPIRADA, CANCELADA, ENCERRADA, CONCLUIDA, FALHA_ATENDIMENTO].includes(request.status)) {
      throw new BadRequestException('Esta emergência já foi encerrada.');
    }
    const session: VideoRoomSession = this.jaas.createSession(
      request.roomSlug,
      { id: user.id, nome: user.nome, email: user.email },
      farmaceutico,
    );
    return {
      ...session,
      status: request.status,
      salaAbertaEm: request.salaAbertaEm,
      farmaceuticoEntrouEm: request.farmaceuticoEntrouEm,
      clienteEntrouEm: request.clienteEntrouEm,
      cliente,
    };
  }

  async entrarSala(requestId: string, user: { id: string; tipo: string; nome?: string; email?: string }) {
    const { request, cliente, farmaceutico } = await this.validarParticipante(requestId, user);
    if (!request.roomSlug || !request.salaAbertaEm) throw new BadRequestException('A sala ainda não foi aberta.');
    if (cliente && !request.farmaceuticoEntrouEm) throw new BadRequestException('Aguardando o farmacêutico entrar na sala.');
    if ([EXPIRADA, CANCELADA, ENCERRADA, CONCLUIDA, FALHA_ATENDIMENTO].includes(request.status)) {
      throw new BadRequestException('Esta emergência já foi encerrada.');
    }

    const data: { farmaceuticoEntrouEm?: Date; clienteEntrouEm?: Date; iniciadoEm?: Date; status?: EmergencyStatus } = {};
    if (farmaceutico && !request.farmaceuticoEntrouEm) {
      data.farmaceuticoEntrouEm = new Date();
      data.status = FARMACEUTICO_AGUARDANDO;
    }
    if (cliente && !request.clienteEntrouEm) {
      data.clienteEntrouEm = new Date();
      data.iniciadoEm = new Date();
      data.status = EM_ATENDIMENTO;
    }
    if (Object.keys(data).length === 0) return request;
    return this.prisma.emergencyRequest.update({ where: { id: requestId }, data });
  }

  async abrirSala(requestId: string, farmaceuticoId: string) {
    const request = await this.getRequestOrThrow(requestId);
    if (request.farmaceuticoId !== farmaceuticoId) {
      throw new ForbiddenException('Esta emergência não está vinculada a você.');
    }
    if (![ATENDIDA, FARMACEUTICO_AGUARDANDO].includes(request.status)) {
      throw new ConflictException('Esta emergência não está pronta para abrir a sala.');
    }

    const roomSlug = request.roomSlug ?? `farma-emergencia-${crypto.randomBytes(6).toString('hex')}`;
    const roomToken = request.roomToken ?? crypto.randomBytes(24).toString('hex');
    const atualizado = await this.prisma.emergencyRequest.update({
      where: { id: requestId },
      data: {
        roomSlug,
        roomToken,
        salaAbertaEm: new Date(),
        status: FARMACEUTICO_AGUARDANDO,
      },
      include: { cliente: { select: { nome: true } } },
    });
    const room = this.jaas.createSession(roomSlug, { id: farmaceuticoId }, true);

    this.logger.log(`Sala de emergência ${requestId} aberta por ${farmaceuticoId}; paciente ${atualizado.cliente.nome} notificado por polling.`);
    return {
      ...atualizado,
      roomUrl: room.roomUrl,
      salaPronta: true,
      notificacaoPaciente: 'O farmacêutico abriu a sala. Você já pode entrar na chamada.',
    };
  }

  // ---------- Farmacêutico: listar abertas ----------

  async listarAbertas() {
    return this.prisma.emergencyRequest.findMany({
      where: { status: EM_ABERTO },
      orderBy: { criadoEm: 'asc' },
      include: { cliente: { select: { id: true, nome: true, email: true } } },
    });
  }

  // ---------- Farmacêutico: aceitar (gera a sala Jitsi) ----------

  async aceitar(requestId: string, farmaceuticoId: string) {
    const request = await this.prisma.emergencyRequest.findUnique({
      where: { id: requestId },
      include: { cliente: { select: { id: true } } },
    });

    if (!request) throw new BadRequestException('Solicitação não encontrada.');
    if (request.status !== EM_ABERTO) {
      throw new ConflictException(`Solicitação já foi ${request.status.toLowerCase()}.`);
    }

    // Aceitação atômica: evita dois farmacêuticos pegarem a mesma solicitação.
    const aceito = await this.prisma.$transaction(async (tx) => {
      const atualizado = await tx.emergencyRequest.updateMany({
        where: { id: requestId, status: EM_ABERTO },
        data: {
          status: ATENDIDA,
          farmaceuticoId,
          aceitoEm: new Date(),
        },
      });
      if (atualizado.count === 0) return null;

      return tx.emergencyRequest.findUnique({
        where: { id: requestId },
        include: {
          farmaceutico: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true, email: true } },
        },
      });
    });

    if (!aceito) {
      throw new ConflictException('Esta solicitação foi aceita por outro farmacêutico.');
    }

    const inicioBloqueio = new Date();
    const fimBloqueio = new Date(inicioBloqueio.getTime() + DURACAO_MAX_MIN * 60_000);
    await this.prisma.availabilityBlockout.create({
      data: {
        farmaceuticoId,
        inicio: inicioBloqueio,
        fim: fimBloqueio,
        motivo: `Emergência ${requestId}`,
      },
    });

    this.logger.log(`Emergência ${requestId} aceita por ${farmaceuticoId}; agenda bloqueada até ${fimBloqueio.toISOString()}`);
    return {
      ...aceito,
      roomUrl: null,
      salaPronta: false,
      notificacaoPaciente: 'O farmacêutico aceitou a emergência e abrirá a sala em seguida.',
    };
  }

  // ---------- Iniciar atendimento ----------

  async iniciar(requestId: string, farmaceuticoId: string) {
    const request = await this.getRequestOrThrow(requestId);
    if (request.farmaceuticoId !== farmaceuticoId) throw new ForbiddenException('Esta solicitação não foi aceita por você.');
    if (![ATENDIDA, FARMACEUTICO_AGUARDANDO].includes(request.status)) {
      throw new BadRequestException('Solicitação não está no estado correto.');
    }
    return this.prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { iniciadoEm: new Date(), status: EM_ATENDIMENTO },
    });
  }

  // ---------- Encerrar ----------

  async encerrar(
    requestId: string,
    farmaceuticoId: string | undefined,
    dto: { status: 'ENCERRADA' | 'CANCELADA' | 'EXPIRADA'; motivoEncerramento?: string },
  ) {
    if (farmaceuticoId) {
      const request = await this.prisma.emergencyRequest.findUnique({ where: { id: requestId } });
      if (request?.farmaceuticoId !== farmaceuticoId) {
        throw new ForbiddenException('Esta solicitação não pertence a você.');
      }
    }

    const request = await this.prisma.emergencyRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new BadRequestException('Solicitação não encontrada.');

    const status = dto.status === 'ENCERRADA'
      ? (request.clienteEntrouEm ? CONCLUIDA : FALHA_ATENDIMENTO)
      : dto.status === 'CANCELADA'
        ? CANCELADA
        : dto.status === 'EXPIRADA'
          ? EXPIRADA
          : dto.status;
    const atualizado = await this.prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { status, encerradoEm: new Date(), motivoEncerramento: dto.motivoEncerramento?.trim() },
    });

    await this.prisma.availabilityBlockout.deleteMany({
      where: { motivo: `Emergência ${requestId}` },
    });

    return atualizado;
  }

  // ---------- Expiração (chamado pelo scheduler a cada minuto) ----------

  /**
   * Expira solicitações em aberto com mais de DURACAO_MAX_MIN minutos
   * e encerra atendimentos em curso que estouraram o tempo limite.
   */
  async expirarTodas() {
    const limite = new Date(Date.now() - DURACAO_MAX_MIN * 60_000);

    const abertasParaExpirar = await this.prisma.emergencyRequest.findMany({
      where: { status: EM_ABERTO, criadoEm: { lt: limite } },
      include: { cliente: { select: { nome: true, email: true } } },
    });
    const abertas = await this.prisma.emergencyRequest.updateMany({
      where: { id: { in: abertasParaExpirar.map((r) => r.id) }, status: EM_ABERTO },
      data: { status: EXPIRADA, encerradoEm: new Date(), motivoEncerramento: 'Expirou por tempo limite' },
    });

    const aguardandoPacienteParaFalhar = await this.prisma.emergencyRequest.findMany({
      where: { status: FARMACEUTICO_AGUARDANDO, salaAbertaEm: { not: null, lt: limite }, clienteEntrouEm: null },
    });
    const falhas = await this.prisma.emergencyRequest.updateMany({
      where: { id: { in: aguardandoPacienteParaFalhar.map((r) => r.id) }, status: FARMACEUTICO_AGUARDANDO },
      data: { status: FALHA_ATENDIMENTO, encerradoEm: new Date(), motivoEncerramento: 'Sala encerrada sem entrada do paciente' },
    });

    const atendidasParaExpirar = await this.prisma.emergencyRequest.findMany({
      where: { status: { in: [ATENDIDA, EM_ATENDIMENTO] }, iniciadoEm: { not: null, lt: limite } },
    });
    const atendidas = await this.prisma.emergencyRequest.updateMany({
      where: { id: { in: atendidasParaExpirar.map((r) => r.id) }, status: { in: [ATENDIDA, EM_ATENDIMENTO] } },
      data: { status: EXPIRADA, encerradoEm: new Date(), motivoEncerramento: 'Expirou por tempo limite' },
    });

    await Promise.allSettled(
      abertasParaExpirar.map((r) =>
        this.mail.sendEmergencyUnavailable(r.cliente.email, r.cliente.nome, r.criadoEm.toLocaleString('pt-BR')),
      ),
    );

    await this.prisma.availabilityBlockout.deleteMany({
      where: { motivo: { in: [...atendidasParaExpirar, ...aguardandoPacienteParaFalhar].map((r) => `Emergência ${r.id}`) } },
    });

    if (abertas.count + falhas.count + atendidas.count > 0) {
      this.logger.warn(
        `${abertas.count} emergência(s) expiraram, ${falhas.count} falharam sem entrada do paciente e ${atendidas.count} atendimento(s) expiraram`,
      );
    }
  }
}
