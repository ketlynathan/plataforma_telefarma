import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SendOptions = { to: string; subject: string; html: string };

const BRAND = '#166534';

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

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private transport: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.get<string>('SMTP_FROM', 'FarmaAtende <naoresponda@farmaatende.com>');
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host) {
      // Sem SMTP configurado: grava os e-mails no console (útil em dev) e não falha.
      this.logger.warn(
        'SMTP não configurado (SMTP_HOST ausente). E-mails serão logados no console em vez de enviados.',
      );
      return;
    }

    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
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

  private async dispatch(options: SendOptions) {
    if (!this.transport) {
      // Fallback: loga no console quando SMTP não está configurado.
      this.logger.log(
        `[MAIL-FALLBACK] to=${options.to} subject="${options.subject}" html_length=${options.html.length}`,
      );
      return;
    }
    try {
      await this.transport.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`E-mail enviado para ${options.to}: ${options.subject}`);
    } catch (err) {
      // Não falha a operação de negócio por causa do envio de e-mail.
      this.logger.error(`Falha ao enviar e-mail para ${options.to}`, err);
    }
  }
}
