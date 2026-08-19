import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MailAttachment = { name: string; content: string };
type SendOptions = { to: string; subject: string; html: string; attachments?: MailAttachment[] };

const BRAND = '#166534';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function baseHtml(title: string, body: string, accent = BRAND): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f5f7f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden">
    <div style="background:${accent};color:#fff;padding:20px 24px;font-size:18px;font-weight:bold">${title}</div>
    <div style="padding:24px;line-height:1.6">${body}</div>
    <div style="padding:12px 24px;background:#f9faf9;color:#6b7280;font-size:12px">FarmaAtende — plataforma de atendimento farmacêutico</div>
  </div>
</body>
</html>`;
}

/** Extrai nome + email de uma string tipo "FarmaAtende <email@dominio.com>". */
function parseFrom(raw: string): { name?: string; email: string } {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (match) {
    return { name: match[1].trim() || undefined, email: match[2].trim() };
  }
  return { email: raw.trim() };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string | undefined;
  private readonly from: { name?: string; email: string };

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY');
    const fromRaw = this.config.get<string>('SMTP_FROM', 'FarmaAtende <naoresponda@farmaatende.com>');
    this.from = parseFrom(fromRaw);

    if (!this.apiKey) {
      this.logger.warn(
        'BREVO_API_KEY não configurada. E-mails serão logados no console em vez de enviados.',
      );
    }
  }

  async sendResetCode(to: string, code: string) {
    return this.dispatch({
      to,
      subject: 'Seu código de recuperação de senha',
      html: baseHtml(
        'Recuperação de senha',
        `<p>Recebemos uma solicitação de recuperação de senha para a sua conta.</p>
         <p style="text-align:center;font-size:32px;letter-spacing:8px;font-weight:bold;color:${BRAND}">${code}</p>
         <p>Este código expira em <strong>15 minutos</strong> e pode ser usado apenas uma vez.</p>
         <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>`,
      ),
    });
  }

  async sendInvite(to: string, token: string, invitedBy: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://farma-consulta-app.onrender.com');
    const link = `${frontendUrl}/aceitar-convite/${token}`;
    return this.dispatch({
      to,
      subject: 'Você foi convidado(a) para o FarmaAtende',
      html: baseHtml(
        'Convite FarmaAtende',
        `<p>${invitedBy} convidou você para atuar como <strong>farmacêutico(a)</strong> na plataforma FarmaAtende.</p>
         <p style="text-align:center;margin:24px 0">
           <a href="${link}" style="background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Aceitar convite</a>
         </p>
         <p>O convite expira em <strong>7 dias</strong>.</p>`,
      ),
    });
  }

  async sendDailyAgenda(
    to: string,
    farmaceuticoNome: string,
    consultas: Array<{ hora: string; pacienteNome: string; pacienteEmail: string; observacoes?: string | null }>,
    dayLabel: string,
  ) {
    const rows = consultas
      .map(
        (c) =>
          `<tr style="border-bottom:1px solid #e5e7eb">
             <td style="padding:10px 12px;font-weight:bold;color:${BRAND}">${c.hora}</td>
             <td style="padding:10px 12px">${c.pacienteNome}<br><span style="color:#6b7280;font-size:12px">${c.pacienteEmail}</span></td>
             <td style="padding:10px 12px;color:#6b7280">${c.observacoes || '—'}</td>
           </tr>`,
      )
      .join('');

    return this.dispatch({
      to,
      subject: `Sua agenda de ${dayLabel} — FarmaAtende`,
      html: baseHtml(
        `Agenda de ${dayLabel}`,
        `<p>Olá, <strong>${farmaceuticoNome}</strong>. Estas são as suas consultas agendadas para hoje:</p>
         <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px">
           <thead><tr style="color:#6b7280;font-size:12px;text-align:left"><th style="padding:8px 12px">Hora</th><th style="padding:8px 12px">Paciente</th><th style="padding:8px 12px">Observações</th></tr></thead>
           <tbody>${rows}</tbody>
         </table>
         <p style="margin-top:16px">Boa jornada de atendimento!</p>`,
      ),
    });
  }

  async sendConsultationBooked(
    to: string,
    farmaceuticoNome: string,
    consulta: {
      pacienteNome: string;
      data: string;
      hora: string;
      timezone?: string;
      observacoes?: string | null;
      consultationLink?: string;
      calendarLink?: string | null;
      attachments?: MailAttachment[];
    },
  ) {
    const link = consulta.consultationLink;
    return this.dispatch({
      to,
      subject: `Nova consulta agendada para ${consulta.data} às ${consulta.hora} — FarmaAtende`,
      attachments: consulta.attachments,
      html: baseHtml(
        'Nova consulta agendada',
        `<p>Olá, <strong>${farmaceuticoNome}</strong>.</p>
         <p>Uma nova consulta foi agendada para <strong>${consulta.data}</strong>, às <strong>${consulta.hora}</strong>${consulta.timezone ? ` (${consulta.timezone})` : ''}.</p>
         <p><strong>Paciente:</strong> ${consulta.pacienteNome}</p>
         <p><strong>Observações:</strong> ${consulta.observacoes || '—'}</p>
         ${link ? `<p style="text-align:center;margin:24px 0"><a href="${link}" style="background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir atendimento</a></p>` : '<p>Acesse a plataforma para consultar os detalhes e entrar na sala de atendimento.</p>'}
         ${consulta.calendarLink ? `<p><a href="${consulta.calendarLink}">Ver evento no Google Calendar</a></p>` : '<p>O arquivo de calendário desta consulta está anexado a este e-mail.</p>'}`,
      ),
    });
  }

  async sendPatientConsultationBooked(
    to: string,
    pacienteNome: string,
    consulta: {
      farmaceuticoNome: string;
      data: string;
      hora: string;
      timezone?: string;
      consultationLink?: string;
      calendarLink?: string | null;
      attachments?: MailAttachment[];
    },
  ) {
    return this.dispatch({
      to,
      subject: `Sua consulta foi confirmada para ${consulta.data} às ${consulta.hora} — FarmaAtende`,
      attachments: consulta.attachments,
      html: baseHtml(
        'Consulta confirmada',
        `<p>Olá, <strong>${pacienteNome}</strong>.</p>
         <p>Sua consulta com <strong>${consulta.farmaceuticoNome}</strong> está agendada para <strong>${consulta.data}</strong>, às <strong>${consulta.hora}</strong>${consulta.timezone ? ` (${consulta.timezone})` : ''}.</p>
         <p>O convite do Google Calendar e um arquivo compatível com outros calendários estão anexados. Os lembretes dependem das notificações ativadas no aplicativo de calendário.</p>
         ${consulta.consultationLink ? `<p style="text-align:center;margin:24px 0"><a href="${consulta.consultationLink}" style="background:${BRAND};color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Ir para minha consulta</a></p>` : ''}
         ${consulta.calendarLink ? `<p><a href="${consulta.calendarLink}">Abrir evento no Google Calendar</a></p>` : ''}`,
      ),
    });
  }

  async sendEmergencyAlert(
    to: string,
    farmaceuticoNome: string,
    emergencia: { pacienteNome: string; criadoEm: string },
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'https://farma-consulta-app.onrender.com');
    return this.dispatch({
      to,
      subject: 'Solicitação de emergência farmacêutica — FarmaAtende',
      html: baseHtml(
        'Emergência farmacêutica',
        `<p>Olá, <strong>${farmaceuticoNome}</strong>.</p>
         <p>O paciente <strong>${emergencia.pacienteNome}</strong> solicitou atendimento de emergência.</p>
         <p>O pedido foi aberto em <strong>${emergencia.criadoEm}</strong>. Mesmo que você esteja marcado como indisponível, entre na plataforma se puder assumir o atendimento.</p>
         <p style="text-align:center;margin:24px 0"><a href="${frontendUrl}/farmaceutico" style="background:#b91c1c;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Ver emergência</a></p>
         <p>O primeiro farmacêutico que aceitar ficará responsável pela chamada.</p>`,
        '#b91c1c',
      ),
    });
  }

  async sendEmergencyUnavailable(
    to: string,
    pacienteNome: string,
    criadoEm: string,
  ) {
    return this.dispatch({
      to,
      subject: 'Não foi possível atender sua emergência — FarmaAtende',
      html: baseHtml(
        'Emergência sem atendimento',
        `<p>Olá, <strong>${pacienteNome}</strong>.</p>
         <p>Recebemos sua solicitação de emergência em <strong>${criadoEm}</strong>, mas nenhum farmacêutico conseguiu assumir o atendimento dentro do prazo.</p>
         <p>Pedimos desculpas pela indisponibilidade. Se a situação for urgente ou representar risco à sua saúde, procure imediatamente um serviço de emergência.</p>`,
        '#b91c1c',
      ),
    });
  }

  private async dispatch(options: SendOptions) {
    if (!this.apiKey) {
      this.logger.log(
        `[MAIL-FALLBACK] to=${options.to} subject="${options.subject}" html_length=${options.html.length}`,
      );
      return;
    }

    try {
      const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: this.from,
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          ...(options.attachments?.length ? { attachment: options.attachments } : {}),
        }),
      });

      if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Brevo API respondeu ${response.status}: ${bodyText}`);
      }

      this.logger.log(`E-mail enviado para ${options.to}: ${options.subject}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${options.to}`, err);
    }
  }
}
