import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmergencyService } from '../emergency/emergency.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private diasSemana = [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ];

  constructor(
    private readonly emergency: EmergencyService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verificação de emergência a cada minuto (itens 25-26).
   * Expira solicitações em aberto e atendimentos que estouraram 30 min.
   */
  @Cron('* * * * *')
  async expirarEmergencias() {
    await this.emergency.expirarTodas();
  }

  /**
   * E-mail diário com a agenda do dia para cada farmacêutico (item 15).
   * Executa às 07:00 (fuso do servidor; Render roda em UTC — ajuste conforme necessidade).
   */
  @Cron('0 11 * * *') // 07:00 BRT = 11:00 UTC (Render)
  async enviarAgendaDiaria() {
    const hoje = new Date();
    const dataIso = hoje.toISOString().slice(0, 10);

    const farmaceuticos = await this.prisma.user.findMany({
      where: { tipo: 'farmaceutico', ativo: true, email: { not: '' } },
      select: { id: true, nome: true, email: true },
    });

    for (const farm of farmaceuticos) {
      const consultas = await this.prisma.consulta.findMany({
        where: {
          farmaceuticoId: farm.id,
          data: hoje,
          status: { not: 'CANCELADA' },
        },
        orderBy: { hora: 'asc' },
      });

      if (consultas.length === 0) {
        this.logger.log(`Nenhuma consulta hoje para ${farm.nome}; e-mail pulado.`);
        continue;
      }

      await this.mail.sendDailyAgenda(
        farm.email,
        farm.nome,
        consultas.map((c) => ({
          hora: c.hora,
          pacienteNome: c.pacienteNome,
          pacienteEmail: c.pacienteEmail,
          observacoes: c.observacoes,
        })),
        `${hoje.getDate()}/${String(hoje.getMonth() + 1).padStart(2, '0')}`,
      );
    }
  }
}
