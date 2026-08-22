import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CalendarService } from '../calendar/calendar.service';
import { MailService } from '../mail/mail.service';
import { dateOnlyToUtc, DEFAULT_TIME_ZONE, isValidTimeZone, zonedDateTimeToUtc } from '../common/timezone';
import { CreateCheckoutDto, CreateProductPriceDto, MercadoPagoWebhookDto, UpdateProductPriceDto } from './dto/payment.dto';

const CLIENTE = 'cliente';
const FARMACEUTICO = 'farmaceutico';
const ADMIN = 'admin';
const HOLD_MINUTES = 15;
const MIN_ADVANCE_MINUTES = 50;
const SLOT_MINUTES = 60;
const MP_API = 'https://api.mercadopago.com';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: CalendarService,
    private readonly mail: MailService,
  ) {}

  private ensureAdmin(user: { tipo: string }) {
    if (user.tipo !== ADMIN) throw new ForbiddenException('Acesso restrito ao administrador.');
  }

  private ensurePatient(user: { tipo: string }) {
    if (user.tipo !== CLIENTE) throw new ForbiddenException('Somente o paciente pode iniciar um pagamento.');
  }

  private frontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  }

  private notificationUrl() {
    const configured = process.env.MERCADO_PAGO_NOTIFICATION_URL?.trim();
    if (configured) return configured;
    const backend = process.env.BACKEND_PUBLIC_URL?.trim();
    return backend ? `${backend.replace(/\/$/, '')}/api/payments/mercado-pago/webhook` : undefined;
  }

  private accessToken() {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!token) throw new ServiceUnavailableException('Mercado Pago ainda não foi configurado no backend.');
    return token;
  }

  private async mercadoPagoRequest(path: string, init: RequestInit = {}) {
    const response = await fetch(`${MP_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken()}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    if (!response.ok) {
      this.logger.error(`Mercado Pago ${response.status} em ${path}: ${text.slice(0, 500)}`);
      throw new ServiceUnavailableException('Não foi possível comunicar com o Mercado Pago.');
    }
    return body;
  }

  async listPublicPrices() {
    return this.prisma.productPrice.findMany({
      where: { ativo: true },
      select: { id: true, slug: true, nome: true, descricao: true, tipoAtendimento: true, valorCentavos: true, versao: true },
      orderBy: { nome: 'asc' },
    });
  }

  async listAdminPrices(user: { tipo: string }) {
    this.ensureAdmin(user);
    return this.prisma.productPrice.findMany({ orderBy: [{ slug: 'asc' }, { versao: 'desc' }] });
  }

  async createPrice(user: { id: string; tipo: string }, dto: CreateProductPriceDto) {
    this.ensureAdmin(user);
    const slug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new BadRequestException('Slug inválido.');
    const latest = await this.prisma.productPrice.findFirst({ where: { slug }, orderBy: { versao: 'desc' }, select: { versao: true } });
    const price = await this.prisma.productPrice.create({
      data: {
        slug,
        nome: dto.nome.trim(),
        descricao: dto.descricao?.trim() || null,
        tipoAtendimento: dto.tipoAtendimento,
        valorCentavos: dto.valorCentavos,
        versao: (latest?.versao ?? 0) + 1,
        ativo: true,
        criadoPorId: user.id,
      },
    });
    await this.audit(user.id, 'PRODUCT_PRICE', price.id, 'CRIAR');
    return price;
  }

  async updatePrice(user: { id: string; tipo: string }, id: string, dto: UpdateProductPriceDto) {
    this.ensureAdmin(user);
    const current = await this.prisma.productPrice.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Preço não encontrado.');
    const next = await this.prisma.productPrice.create({
      data: {
        slug: current.slug,
        nome: dto.nome?.trim() ?? current.nome,
        descricao: dto.descricao !== undefined ? dto.descricao.trim() : current.descricao,
        tipoAtendimento: current.tipoAtendimento,
        valorCentavos: dto.valorCentavos ?? current.valorCentavos,
        versao: current.versao + 1,
        ativo: dto.ativo ?? current.ativo,
        criadoPorId: user.id,
      },
    });
    if (next.ativo) {
      await this.prisma.productPrice.updateMany({ where: { slug: current.slug, id: { not: next.id }, ativo: true }, data: { ativo: false } });
    }
    await this.audit(user.id, 'PRODUCT_PRICE', next.id, 'EDITAR', 'SUCESSO', { slug: current.slug, versao: next.versao });
    return next;
  }

  private validateSchedule(data: string, hora: string, timezone: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new BadRequestException('Data inválida.');
    if (!/^\d{2}:\d{2}$/.test(hora)) throw new BadRequestException('Horário inválido.');
    const [h, m] = hora.split(':').map(Number);
    if (h > 23 || m > 59) throw new BadRequestException('Horário inválido.');
    const inicio = zonedDateTimeToUtc(data, hora, timezone);
    if (Number.isNaN(inicio.getTime())) throw new BadRequestException('Data ou horário inválido.');
    if (inicio.getTime() < Date.now() + MIN_ADVANCE_MINUTES * 60_000) {
      throw new BadRequestException(`O agendamento precisa ser feito com pelo menos ${MIN_ADVANCE_MINUTES} minutos de antecedência no fuso da agenda (${timezone}).`);
    }
    return inicio;
  }

  private async expireOldHolds(tx: Prisma.TransactionClient, now = new Date()) {
    await tx.bookingHold.updateMany({ where: { status: 'PENDENTE', expiraEm: { lte: now } }, data: { status: 'EXPIRADO' } });
  }

  async createCheckout(user: { id: string; tipo: string }, dto: CreateCheckoutDto) {
    this.ensurePatient(user);
    const [patient, price, pharmacist] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, nome: true, email: true, tipo: true } }),
      this.prisma.productPrice.findFirst({ where: { id: dto.productPriceId, ativo: true } }),
      this.prisma.user.findUnique({ where: { id: dto.farmaceuticoId }, select: { id: true, nome: true, email: true, tipo: true, ativo: true, timezone: true } }),
    ]);
    if (!patient || patient.tipo !== CLIENTE) throw new ForbiddenException('Paciente não encontrado.');
    if (!price) throw new BadRequestException('Serviço ou preço indisponível.');
    if (!pharmacist || pharmacist.tipo !== FARMACEUTICO || !pharmacist.ativo) throw new BadRequestException('Farmacêutico indisponível.');
    const agendaTimezone = isValidTimeZone(pharmacist.timezone) ? pharmacist.timezone : DEFAULT_TIME_ZONE;
    const inicio = this.validateSchedule(dto.data, dto.hora, agendaTimezone);
    const dataDate = dateOnlyToUtc(dto.data);
    const expiraEm = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const notificationUrl = this.notificationUrl();
    if (!notificationUrl) throw new ServiceUnavailableException('Configure BACKEND_PUBLIC_URL ou MERCADO_PAGO_NOTIFICATION_URL no Render.');

    const holdAndPayment = await this.prisma.$transaction(async (tx) => {
      await this.expireOldHolds(tx);
      const consultaExistente = await tx.consulta.findFirst({ where: { farmaceuticoId: pharmacist.id, data: dataDate, hora: dto.hora, status: { not: 'CANCELADA' } }, select: { id: true } });
      if (consultaExistente) throw new ConflictException('Este horário já está reservado.');
      const holdExistente = await tx.bookingHold.findFirst({ where: { farmaceuticoId: pharmacist.id, agendadoEmUtc: inicio, status: 'PENDENTE', expiraEm: { gt: new Date() } }, select: { id: true } });
      if (holdExistente) throw new ConflictException('Este horário está sendo finalizado por outro paciente.');
      const hold = await tx.bookingHold.create({
        data: {
          pacienteId: patient.id,
          farmaceuticoId: pharmacist.id,
          productPriceId: price.id,
          pacienteNome: patient.nome,
          pacienteEmail: patient.email,
          data: dataDate,
          hora: dto.hora,
          agendaTimezone,
          agendadoEmUtc: inicio,
          observacoes: dto.observacoes?.trim() || null,
          status: 'PENDENTE',
          expiraEm,
        },
      });
      const payment = await tx.payment.create({
        data: { pacienteId: patient.id, productPriceId: price.id, bookingHoldId: hold.id, amountCentavos: price.valorCentavos, expiresAt: expiraEm, status: 'PENDENTE' },
      });
      return { hold, payment, patient, pharmacist, price };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try {
      const preference = await this.mercadoPagoRequest('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ id: holdAndPayment.price.slug, title: holdAndPayment.price.nome, description: holdAndPayment.price.descricao || 'Consulta farmacêutica', quantity: 1, currency_id: 'BRL', unit_price: holdAndPayment.price.valorCentavos / 100 }],
          payer: { name: holdAndPayment.patient.nome, email: holdAndPayment.patient.email },
          external_reference: holdAndPayment.payment.id,
          notification_url: notificationUrl,
          back_urls: { success: `${this.frontendUrl()}/cliente/consultas?pagamento=sucesso`, failure: `${this.frontendUrl()}/cliente/agendar?pagamento=falhou`, pending: `${this.frontendUrl()}/cliente/consultas?pagamento=pendente` },
          auto_return: 'approved',
          statement_descriptor: 'FARMA CONSULTA',
          metadata: { payment_id: holdAndPayment.payment.id, booking_hold_id: holdAndPayment.hold.id },
        }),
      });
      const checkoutUrl = process.env.MERCADO_PAGO_MODE === 'test'
        ? (preference.sandbox_init_point || preference.init_point)
        : (preference.init_point || preference.sandbox_init_point);
      if (!checkoutUrl) throw new Error('Mercado Pago não retornou a URL de checkout.');
      const updated = await this.prisma.payment.update({ where: { id: holdAndPayment.payment.id }, data: { externalPreferenceId: String(preference.id), checkoutUrl } });
      return { paymentId: updated.id, checkoutUrl, expiresAt: expiraEm, amountCentavos: price.valorCentavos, product: { id: price.id, nome: price.nome, tipoAtendimento: price.tipoAtendimento } };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.payment.update({ where: { id: holdAndPayment.payment.id }, data: { status: 'ERRO_CHECKOUT' } }),
        this.prisma.bookingHold.update({ where: { id: holdAndPayment.hold.id }, data: { status: 'LIBERADO' } }),
      ]);
      throw error;
    }
  }

  async getPayment(user: { id: string; tipo: string }, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { productPrice: true, consulta: { select: { id: true, status: true, data: true, hora: true } } } });
    if (!payment) throw new NotFoundException('Pagamento não encontrado.');
    if (user.tipo !== ADMIN && payment.pacienteId !== user.id) throw new ForbiddenException('Você não tem acesso a este pagamento.');
    return { id: payment.id, status: payment.status, checkoutUrl: payment.checkoutUrl, amountCentavos: payment.amountCentavos, expiresAt: payment.expiresAt, approvedAt: payment.approvedAt, product: payment.productPrice, consulta: payment.consulta };
  }

  private verifyWebhookSignature(body: MercadoPagoWebhookDto, headers: Record<string, string | string[] | undefined>, query: Record<string, any>) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();
    if (!secret) {
      if (!['development', 'test'].includes(process.env.NODE_ENV || '')) {
        throw new UnauthorizedException('Webhook do Mercado Pago não configurado.');
      }
      return;
    }
    const signature = String(headers['x-signature'] || '');
    const requestId = String(headers['x-request-id'] || '');
    const dataId = String(query.id || body.data?.id || '');
    const ts = signature.match(/(?:^|,)ts=([^,]+)/)?.[1];
    const v1 = signature.match(/(?:^|,)v1=([^,]+)/)?.[1];
    if (!ts || !v1 || !dataId || !requestId) throw new UnauthorizedException('Assinatura de webhook inválida.');
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    const received = Buffer.from(v1, 'utf8');
    const calculated = Buffer.from(expected, 'utf8');
    if (received.length !== calculated.length || !timingSafeEqual(received, calculated)) throw new UnauthorizedException('Assinatura de webhook inválida.');
  }

  private mapProviderStatus(status: string) {
    switch (status) {
      case 'approved': return 'APROVADO';
      case 'rejected': return 'RECUSADO';
      case 'cancelled': return 'CANCELADO';
      case 'refunded':
      case 'charged_back': return 'ESTORNADO';
      case 'in_process':
      case 'pending': return 'PENDENTE';
      default: return 'PENDENTE';
    }
  }

  async handleWebhook(body: MercadoPagoWebhookDto, headers: Record<string, string | string[] | undefined>, query: Record<string, any>) {
    this.verifyWebhookSignature(body, headers, query);
    const providerPaymentId = String(query['data.id'] || query.id || body.data?.id || '');
    if (!providerPaymentId) return { received: true, ignored: true };
    const providerPayment = await this.mercadoPagoRequest(`/v1/payments/${encodeURIComponent(providerPaymentId)}`);
    const internalId = String(providerPayment.external_reference || providerPayment.metadata?.payment_id || '');
    if (!internalId) {
      this.logger.warn(`Pagamento ${providerPaymentId} sem referência interna.`);
      return { received: true, ignored: true };
    }
    const status = this.mapProviderStatus(providerPayment.status);
    const eventId = `payment:${providerPaymentId}:${providerPayment.status}`;
    const payloadHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
    let createdConsultaId: string | null = null;
    let createdPaymentId: string | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { id: internalId }, include: { bookingHold: true, productPrice: true } });
        if (!payment) throw new NotFoundException('Pagamento interno não encontrado.');
        createdPaymentId = payment.id;
        const alreadyProcessed = await tx.paymentWebhookEvent.findUnique({ where: { provider_eventId: { provider: 'MERCADO_PAGO', eventId } } });
        if (alreadyProcessed) return;
        await tx.paymentWebhookEvent.create({ data: { provider: 'MERCADO_PAGO', eventId, paymentId: payment.id, payloadHash, processadoEm: new Date() } });
        if (status !== 'APROVADO') {
          await tx.payment.update({ where: { id: payment.id }, data: { externalPaymentId: String(providerPayment.id), status, refundedAt: status === 'ESTORNADO' ? new Date() : undefined } });
          if (payment.bookingHoldId && payment.bookingHold?.status === 'PENDENTE') await tx.bookingHold.update({ where: { id: payment.bookingHoldId }, data: { status: status === 'PENDENTE' ? 'PENDENTE' : 'LIBERADO' } });
          return;
        }
        if (payment.status === 'APROVADO' && payment.consultaId) { return; }
        const hold = payment.bookingHold;
        if (!hold || hold.status !== 'PENDENTE' || hold.expiraEm <= new Date()) {
          await tx.payment.update({ where: { id: payment.id }, data: { externalPaymentId: String(providerPayment.id), status: 'EXPIRADO' } });
          if (hold && hold.status === 'PENDENTE') await tx.bookingHold.update({ where: { id: hold.id }, data: { status: 'EXPIRADO' } });
          return;
        }
        const conflict = await tx.consulta.findFirst({ where: { farmaceuticoId: hold.farmaceuticoId, data: hold.data, hora: hold.hora, status: { not: 'CANCELADA' } }, select: { id: true } });
        if (conflict) {
          await tx.payment.update({ where: { id: payment.id }, data: { externalPaymentId: String(providerPayment.id), status: 'ERRO_CONFLITO' } });
          await tx.bookingHold.update({ where: { id: hold.id }, data: { status: 'CONFLITO' } });
          return;
        }
        const consulta = await tx.consulta.create({
          data: {
            pacienteNome: hold.pacienteNome,
            pacienteEmail: hold.pacienteEmail,
            data: hold.data,
            hora: hold.hora,
            status: 'AGENDADA',
            observacoes: hold.observacoes || '',
            farmaceuticoId: hold.farmaceuticoId,
            agendaTimezone: hold.agendaTimezone,
            agendadoEmUtc: hold.agendadoEmUtc,
            roomSlug: `farma-${hold.data.toISOString().slice(0, 10).replace(/-/g, '')}-${hold.hora.replace(':', '')}-${hold.farmaceuticoId.slice(0, 8)}`,
            roomToken: createHash('sha256').update(`${hold.id}:${Date.now()}`).digest('hex').slice(0, 48),
            tipoAtendimento: payment.productPrice.tipoAtendimento,
          },
        });
        await tx.payment.update({ where: { id: payment.id }, data: { externalPaymentId: String(providerPayment.id), status: 'APROVADO', approvedAt: new Date(), consultaId: consulta.id } });
        await tx.bookingHold.update({ where: { id: hold.id }, data: { status: 'CONVERTIDO', convertidoEm: new Date() } });
        createdConsultaId = consulta.id;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2002') return { received: true, duplicate: true };
      throw error;
    }

    if (createdConsultaId && createdPaymentId) await this.finalizeBooking(createdConsultaId, createdPaymentId);
    return { received: true, paymentId: createdPaymentId, consultaId: createdConsultaId };
  }

  private async finalizeBooking(consultaId: string, paymentId: string) {
    const consulta = await this.prisma.consulta.findUnique({ where: { id: consultaId }, include: { farmaceutico: { select: { nome: true, email: true } } } });
    if (!consulta) return;
    try {
      let assets: Awaited<ReturnType<CalendarService['prepareBookingAssets']>> | null = null;
      try {
        assets = await this.calendar.prepareBookingAssets(consultaId);
      } catch (error) {
        this.logger.warn(`Calendário opcional não conectado para ${consultaId}: ${String(error)}`);
      }
      const attachments = assets ? [{ name: assets.icsFilename, content: assets.icsContentBase64 }] : undefined;
      const front = this.frontendUrl();
      await this.mail.sendConsultationBooked(consulta.farmaceutico?.email || '', consulta.farmaceutico?.nome || 'Farmacêutico(a)', {
        pacienteNome: consulta.pacienteNome,
        data: consulta.data.toISOString().slice(0, 10),
        hora: consulta.hora,
        timezone: consulta.agendaTimezone,
        observacoes: consulta.observacoes || undefined,
        consultationLink: assets?.pharmacistLink || `${front}/farmaceutico/consulta-online?consulta=${consulta.id}`,
        calendarLink: assets?.calendarLink,
        attachments,
      });
      await this.mail.sendPatientConsultationBooked(consulta.pacienteEmail, consulta.pacienteNome, {
        farmaceuticoNome: consulta.farmaceutico?.nome || 'farmacêutico(a)',
        data: consulta.data.toISOString().slice(0, 10),
        hora: consulta.hora,
        timezone: consulta.agendaTimezone,
        consultationLink: assets?.patientLink || `${front}/cliente/consultas?consulta=${consulta.id}`,
        calendarLink: assets?.calendarLink,
        attachments,
      });
      this.logger.log(`Pagamento ${paymentId} aprovado; consulta ${consultaId} confirmada e notificada.`);
    } catch (error) {
      this.logger.error(`Pagamento ${paymentId} aprovado, mas notificações/calendário falharam: ${String(error)}`);
    }
  }

  async expireBookingHolds() {
    const result = await this.prisma.bookingHold.updateMany({
      where: { status: 'PENDENTE', expiraEm: { lte: new Date() } },
      data: { status: 'EXPIRADO' },
    });
    if (result.count > 0) {
      await this.prisma.payment.updateMany({
        where: { bookingHold: { status: 'EXPIRADO' }, status: 'PENDENTE' },
        data: { status: 'EXPIRADO' },
      });
      this.logger.log(`${result.count} reserva(s) de pagamento expirada(s).`);
    }
    return result.count;
  }

  async listAdminPayments(user: { tipo: string }) {
    this.ensureAdmin(user);
    return this.prisma.payment.findMany({ include: { productPrice: true, consulta: { select: { id: true, pacienteNome: true, pacienteEmail: true, data: true, hora: true, status: true } } }, orderBy: { criadoEm: 'desc' }, take: 200 });
  }

  private async audit(atorId: string, alvoTipo: string, alvoId: string, acao: string, resultado = 'SUCESSO', metadadosJson?: Record<string, unknown>) {
    await this.prisma.auditEvent.create({ data: { atorId, alvoTipo, alvoId, acao, resultado, metadadosJson: metadadosJson as Prisma.InputJsonValue | undefined } });
  }
}
