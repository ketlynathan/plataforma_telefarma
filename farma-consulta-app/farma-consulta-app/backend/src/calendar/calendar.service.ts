import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  APP_TIME_ZONE,
  DEFAULT_TIME_ZONE,
  formatDateInZone,
  formatTimeInZone,
  isoDateFromDateOnly,
  isValidTimeZone,
  zonedDateTimeToUtc,
} from '../common/timezone';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_ID = 'primary';
const DURACAO_CONSULTA_MIN = 60;
const STATE_TTL_MS = 10 * 60 * 1000;

type CalendarConnectionStatus = {
  configured: boolean;
  connected: boolean;
  connectedAt: Date | null;
};

type CalendarBookingAssets = {
  patientLink: string;
  pharmacistLink: string;
  calendarLink: string | null;
  icsFilename: string;
  icsContentBase64: string;
};

type CalendarConsulta = {
  id: string;
  pacienteNome: string;
  pacienteEmail: string;
  data: Date;
  hora: string;
  observacoes: string | null;
  agendaTimezone: string;
  agendadoEmUtc: Date | null;
  googleCalendarId: string | null;
  googleEventId: string | null;
  farmaceuticoId: string | null;
  farmaceutico: {
    id: string;
    nome: string;
    email: string;
  } | null;
};

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly redirectUri: string | undefined;
  private readonly frontendUrl: string;
  private readonly stateSecret: string;
  private readonly tokenEncryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    this.clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    this.redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    this.frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    ).replace(/\/$/, '');
    this.stateSecret = this.config.get<string>('JWT_SECRET', 'calendar-state-development-secret');
    this.tokenEncryptionKey = crypto
      .createHash('sha256')
      .update(this.config.get<string>('GOOGLE_TOKEN_ENCRYPTION_KEY', this.stateSecret))
      .digest();
  }

  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.tokenEncryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
  }

  private decryptToken(value: string): string {
    if (!value.startsWith('v1:')) return value;
    const [, ivEncoded, tagEncoded, ciphertextEncoded] = value.split(':');
    if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error('Token Google Calendar corrompido.');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.tokenEncryptionKey,
      Buffer.from(ivEncoded, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }

  frontendErrorUrl(): string {
    return `${this.frontendUrl}/farmaceutico/perfil`;
  }

  private getOAuthClient() {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'A conexão com o Google Calendar ainda não foi configurada pela plataforma.',
      );
    }
    return new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
  }

  private createSignedState(userId: string): string {
    const payload = base64Url(JSON.stringify({
      userId,
      exp: Date.now() + STATE_TTL_MS,
      nonce: crypto.randomBytes(16).toString('hex'),
    }));
    const signature = crypto
      .createHmac('sha256', this.stateSecret)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private readSignedState(state: string): { userId: string } {
    const [payload, signature] = state.split('.');
    if (!payload || !signature) throw new BadRequestException('Estado OAuth inválido.');

    const expected = crypto
      .createHmac('sha256', this.stateSecret)
      .update(payload)
      .digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      signatureBuffer.length !== expectedBuffer.length
      || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Estado OAuth inválido.');
    }

    let decoded: { userId?: string; exp?: number };
    try {
      decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Estado OAuth inválido.');
    }
    if (!decoded.userId || !decoded.exp || decoded.exp < Date.now()) {
      throw new BadRequestException('A autorização do Google expirou. Tente conectar novamente.');
    }
    return { userId: decoded.userId };
  }

  async getStatus(userId: string): Promise<CalendarConnectionStatus> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { connectedAt: true },
    });
    return {
      configured: this.isConfigured(),
      connected: Boolean(connection),
      connectedAt: connection?.connectedAt ?? null,
    };
  }

  async createAuthorizationUrl(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tipo: true, email: true },
    });
    if (!user || user.tipo !== 'farmaceutico') {
      throw new BadRequestException('Apenas farmacêuticos podem conectar um calendário.');
    }

    const oauthClient = this.getOAuthClient();
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      include_granted_scopes: true,
      prompt: 'consent',
      login_hint: user.email,
      scope: [GOOGLE_CALENDAR_SCOPE],
      state: this.createSignedState(userId),
    });
    return { url };
  }

  async handleOAuthCallback(code: string, state: string): Promise<string> {
    if (!code || !state) throw new BadRequestException('Resposta OAuth incompleta.');
    const { userId } = this.readSignedState(state);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tipo: true, ativo: true },
    });
    if (!user || user.tipo !== 'farmaceutico' || !user.ativo) {
      throw new BadRequestException('Farmacêutico não encontrado ou inativo.');
    }

    const oauthClient = this.getOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    const previous = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
      select: { refreshToken: true },
    });
    const refreshToken = tokens.refresh_token
      ?? (previous?.refreshToken ? this.decryptToken(previous.refreshToken) : undefined);
    if (!refreshToken) {
      throw new BadRequestException(
        'O Google não retornou um refresh token. Remova a autorização anterior do Google e conecte novamente.',
      );
    }

    oauthClient.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauthClient });
    await calendar.calendarList.get({ calendarId: CALENDAR_ID });

    await this.prisma.googleCalendarConnection.upsert({
      where: { userId },
      create: {
        userId,
        refreshToken: this.encryptToken(refreshToken),
        scope: tokens.scope ?? GOOGLE_CALENDAR_SCOPE,
      },
      update: {
        refreshToken: this.encryptToken(refreshToken),
        scope: tokens.scope ?? GOOGLE_CALENDAR_SCOPE,
      },
    });

    this.logger.log(`Google Calendar conectado para o usuário ${userId}`);
    return `${this.frontendUrl}/farmaceutico/perfil?calendar=connected`;
  }

  async cancelEventForConsulta(consultaId: string): Promise<void> {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      select: {
        googleCalendarId: true,
        googleEventId: true,
        farmaceutico: {
          select: {
            id: true,
            googleCalendarConnection: { select: { refreshToken: true } },
          },
        },
      },
    });
    const refreshToken = consulta?.farmaceutico?.googleCalendarConnection?.refreshToken;
    if (!consulta?.googleCalendarId || !consulta.googleEventId || !refreshToken || !this.isConfigured()) return;

    try {
      const oauthClient = this.getOAuthClient();
      oauthClient.setCredentials({ refresh_token: this.decryptToken(refreshToken) });
      const calendar = google.calendar({ version: 'v3', auth: oauthClient });
      await calendar.events.patch({
        calendarId: consulta.googleCalendarId,
        eventId: consulta.googleEventId,
        requestBody: { status: 'cancelled' },
        sendUpdates: 'all',
      });
      this.logger.log(`Evento Google Calendar cancelado para a consulta ${consultaId}`);
    } catch (error) {
      this.logger.warn(`Não foi possível sincronizar o cancelamento da consulta ${consultaId}: ${String(error)}`);
    }
  }

  async disconnect(userId: string): Promise<{ connected: false }> {
    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId },
    });
    if (!connection) return { connected: false };

    if (this.isConfigured()) {
      try {
        const oauthClient = this.getOAuthClient();
        await oauthClient.revokeToken(this.decryptToken(connection.refreshToken));
      } catch (error) {
        this.logger.warn(`Não foi possível revogar a autorização do Google para ${userId}: ${String(error)}`);
      }
    }

    await this.prisma.googleCalendarConnection.delete({ where: { userId } });
    await this.prisma.consulta.updateMany({
      where: { farmaceuticoId: userId, googleEventId: { not: null } },
      data: { googleCalendarId: null, googleEventId: null },
    });
    this.logger.log(`Google Calendar desconectado para o usuário ${userId}`);
    return { connected: false };
  }

  /**
   * Prepara os links usados nos e-mails e tenta criar o evento no calendário.
   * A criação do evento é opcional: indisponibilidade ou falha do Google não impede o agendamento.
   */
  async prepareBookingAssets(consultaId: string): Promise<CalendarBookingAssets> {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id: consultaId },
      select: {
        id: true,
        pacienteNome: true,
        pacienteEmail: true,
        data: true,
        hora: true,
        observacoes: true,
        agendaTimezone: true,
        agendadoEmUtc: true,
        googleCalendarId: true,
        googleEventId: true,
        farmaceuticoId: true,
        farmaceutico: { select: { id: true, nome: true, email: true } },
      },
    }) as CalendarConsulta | null;

    if (!consulta || !consulta.farmaceutico) {
      throw new BadRequestException('Consulta não encontrada para integração com o calendário.');
    }

    const timezone = isValidTimeZone(consulta.agendaTimezone)
      ? consulta.agendaTimezone
      : DEFAULT_TIME_ZONE;
    const dataIso = isoDateFromDateOnly(consulta.data);
    const inicio = consulta.agendadoEmUtc ?? zonedDateTimeToUtc(dataIso, consulta.hora, timezone);
    const fim = new Date(inicio.getTime() + DURACAO_CONSULTA_MIN * 60_000);
    const patientLink = `${this.frontendUrl}/cliente/consultas?consulta=${encodeURIComponent(consulta.id)}`;
    const pharmacistLink = `${this.frontendUrl}/farmaceutico/consulta-online?consulta=${encodeURIComponent(consulta.id)}`;
    const calendarLink = await this.createEventSafely(consulta, inicio, fim, timezone, patientLink);
    const ics = this.buildIcs(consulta, inicio, fim, timezone, patientLink);

    return {
      patientLink,
      pharmacistLink,
      calendarLink,
      icsFilename: `farma-consulta-${consulta.id}.ics`,
      icsContentBase64: Buffer.from(ics, 'utf8').toString('base64'),
    };
  }

  private async createEventSafely(
    consulta: CalendarConsulta,
    inicio: Date,
    fim: Date,
    timezone: string,
    patientLink: string,
  ): Promise<string | null> {
    if (!consulta.farmaceutico || !this.isConfigured() || !consulta.farmaceuticoId || consulta.googleEventId) return null;
    const farmaceutico = consulta.farmaceutico;

    const connection = await this.prisma.googleCalendarConnection.findUnique({
      where: { userId: farmaceutico.id },
      select: { refreshToken: true },
    });
    if (!connection) return null;

    try {
      const oauthClient = this.getOAuthClient();
      oauthClient.setCredentials({ refresh_token: this.decryptToken(connection.refreshToken) });
      const calendar = google.calendar({ version: 'v3', auth: oauthClient });
      const eventId = `fc${consulta.id.replace(/-/g, '')}`;
      const event = {
        id: eventId,
        summary: `Consulta farmacêutica — ${consulta.pacienteNome}`,
        description: [
          'Consulta agendada pela plataforma Farma Consulta.',
          `Paciente: ${consulta.pacienteNome}`,
          `Farmacêutico(a): ${farmaceutico.nome}`,
          `Fuso da agenda: ${timezone}`,
          consulta.observacoes ? `Observações: ${consulta.observacoes}` : '',
          `Entrar na consulta: ${patientLink}`,
        ].filter(Boolean).join('\n'),
        start: { dateTime: inicio.toISOString(), timeZone: timezone },
        end: { dateTime: fim.toISOString(), timeZone: timezone },
        attendees: [{ email: consulta.pacienteEmail, displayName: consulta.pacienteNome }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 30 },
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 15 },
            { method: 'popup', minutes: 0 },
          ],
        },
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
        visibility: 'private',
      };

      let created;
      try {
        created = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: event,
          sendUpdates: 'all',
        });
      } catch (error: any) {
        if (error?.code !== 409 && error?.response?.status !== 409) throw error;
        created = await calendar.events.get({ calendarId: CALENDAR_ID, eventId });
      }

      const eventIdPersistido = created.data.id ?? eventId;
      await this.prisma.consulta.update({
        where: { id: consulta.id },
        data: { googleCalendarId: CALENDAR_ID, googleEventId: eventIdPersistido },
      });
      this.logger.log(`Evento Google Calendar criado para a consulta ${consulta.id}`);
      return created.data.htmlLink ?? null;
    } catch (error) {
      this.logger.error(`Falha opcional ao criar evento Google Calendar para ${consulta.id}: ${String(error)}`);
      return null;
    }
  }

  private buildIcs(
    consulta: CalendarConsulta,
    inicio: Date,
    fim: Date,
    timezone: string,
    patientLink: string,
  ): string {
    const dtStamp = formatIcsUtc(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Farma Consulta//Telefarmacia//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${consulta.id}@farma-consulta`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatIcsUtc(inicio)}`,
      `DTEND:${formatIcsUtc(fim)}`,
      `SUMMARY:${escapeIcsText(`Consulta farmacêutica — ${consulta.pacienteNome}`)}`,
      `DESCRIPTION:${escapeIcsText(`Consulta na plataforma Farma Consulta. Entrar: ${patientLink}${consulta.observacoes ? `\\nObservações: ${consulta.observacoes}` : ''}`)}`,
      `URL:${patientLink}`,
      `LOCATION:${escapeIcsText(`Atendimento online — ${timezone}`)}`,
      `ORGANIZER;CN=${escapeIcsText(consulta.farmaceutico?.nome ?? 'Farma Consulta')}:mailto:${consulta.farmaceutico?.email ?? 'naoresponda@farmaatende.com'}`,
      `ATTENDEE;CN=${escapeIcsText(consulta.pacienteNome)};RSVP=TRUE:mailto:${consulta.pacienteEmail}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete da consulta farmacêutica',
      'TRIGGER:-PT30M',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete da consulta farmacêutica',
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return `${lines.join('\r\n')}\r\n`;
  }

  formatBookingLabel(inicio: Date, timezone: string): string {
    const safeTimezone = isValidTimeZone(timezone) ? timezone : APP_TIME_ZONE;
    return `${formatDateInZone(inicio, safeTimezone)} às ${formatTimeInZone(inicio, safeTimezone)} (${safeTimezone})`;
  }
}

export { GOOGLE_CALENDAR_SCOPE };
export type { CalendarBookingAssets, CalendarConnectionStatus };
