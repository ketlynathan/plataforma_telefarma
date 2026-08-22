import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmergencyService } from '../emergency/emergency.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_TIME_ZONE, dateOnlyToUtc, isoDateFromDateOnly, isValidTimeZone, todayIso, zonedDateTimeToUtc } from '../common/timezone';
import { PaymentsService } from '../payments/payments.service';

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
    private readonly payments: PaymentsService,
  ) {}

  /**
   * Verificação de emergência a cada minuto (itens 25-26).
   * Expira solicitações em aberto e atendimentos que estouraram 30 min.
   */
  @Cron('* * * * *')
  async expirarEmergencias() {
    await this.emergency.expirarTodas();
    await this.marcarAtendimentosSemPaciente();
    await this.payments.expireBookingHolds();
  }

  /**
   * Se o farmacêutico abriu a sala, mas o paciente não entrou até 40 minutos
   * depois do horário marcado, o atendimento é encerrado como falha.
   */
  private async marcarAtendimentosSemPaciente() {
    const agora = new Date();
    const consultas = await this.prisma.consulta.findMany({
      where: {
        status: 'FARMACEUTICO_AGUARDANDO',
        farmaceuticoEntrouEm: { not: null },
        clienteEntrouEm: null,
      },
    });

    const vencidas = consultas.filter((consulta) => {
      const timezone = isValidTimeZone(consulta.agendaTimezone) ? consulta.agendaTimezone : DEFAULT_TIME_ZONE;
      const inicio = consulta.agendadoEmUtc ?? zonedDateTimeToUtc(isoDateFromDateOnly(consulta.data), consulta.hora, timezone);
      return agora.getTime() > inicio.getTime() + 40 * 60_000;
    });

    if (vencidas.length === 0) return;
    await this.prisma.consulta.updateMany({
      where: { id: { in: vencidas.map((consulta) => consulta.id) }, status: 'FARMACEUTICO_AGUARDANDO' },
      data: { status: 'FARMACEUTICO_AUSENTE' },
    });
    this.logger.log(`${vencidas.length} atendimento(s) marcado(s) como falha por ausência do paciente.`);
  }

  /**
   * E-mail diário com a agenda do dia para cada farmacêutico (item 15).
   * Executa às 07:00 (fuso do servidor; Render roda em UTC — ajuste conforme necessidade).
   */
  @Cron('0 11 * * *') // 07:00 BRT = 11:00 UTC (Render)
  async enviarAgendaDiaria() {
    const dataIso = todayIso();
    const dataHoje = dateOnlyToUtc(dataIso);

    const farmaceuticos = await this.prisma.user.findMany({
      where: { tipo: 'farmaceutico', ativo: true, email: { not: '' } },
      select: { id: true, nome: true, email: true },
    });

    for (const farm of farmaceuticos) {
      const consultas = await this.prisma.consulta.findMany({
        where: {
          farmaceuticoId: farm.id,
          data: dataHoje,
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
        dataIso.split('-').reverse().join('/'),
      );
    }
  }
}
