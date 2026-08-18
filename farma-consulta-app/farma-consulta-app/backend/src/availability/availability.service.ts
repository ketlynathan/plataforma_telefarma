import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { dateOnlyToUtc, todayIso, zonedDateTimeToUtc } from '../common/timezone';

/** Slots fixos de 1 hora (padrão aprovado). */
const DURACAO_SLOT_MIN = 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------- CRUD da disponibilidade semanal ----------

  async getMe(farmaceuticoId: string) {
    return this.prisma.availability.findMany({
      where: { farmaceuticoId },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  /** Substitui a disponibilidade semanal completa (upsert por faixa). */
  async updateMe(
    farmaceuticoId: string,
    slots: Array<{ diaSemana: number; horaInicio: string; horaFim: string; ativo?: boolean }>,
  ) {
    // Remove as faixas existentes e recria as novas (transação curta).
    await this.prisma.availability.deleteMany({ where: { farmaceuticoId } });

    const created = await this.prisma.availability.createManyAndReturn({
      data: slots.map((s) => ({
        farmaceuticoId,
        diaSemana: s.diaSemana,
        horaInicio: s.horaInicio,
        horaFim: s.horaFim,
        ativo: s.ativo ?? true,
      })),
    });

    this.logger.log(`Disponibilidade atualizada para ${slots.length} faixas (${farmaceuticoId})`);
    return created;
  }

  // ---------- Blockouts ----------

  async createBlockout(
    farmaceuticoId: string,
    dto: { inicio: string; fim: string; motivo?: string },
  ) {
    return this.prisma.availabilityBlockout.create({
      data: {
        farmaceuticoId,
        inicio: new Date(dto.inicio),
        fim: new Date(dto.fim),
        motivo: dto.motivo?.trim(),
      },
    });
  }

  async getBlockouts(farmaceuticoId: string) {
    return this.prisma.availabilityBlockout.findMany({
      where: { farmaceuticoId },
      orderBy: { inicio: 'asc' },
    });
  }

  async deleteBlockout(id: string, farmaceuticoId: string) {
    const blockout = await this.prisma.availabilityBlockout.findFirst({
      where: { id, farmaceuticoId },
    });
    if (!blockout) throw new NotFoundException('Bloqueio não encontrado.');
    await this.prisma.availabilityBlockout.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- Motor de slots livres ----------

  /**
   * Cruza Availability × AvailabilityBlockout × Consultas existentes do dia
   * e retorna os horários livres de cada farmacêutico ativo para a data.
   */
  async getSlots(dataIso: string) {
    const alvo = dateOnlyToUtc(dataIso);
    const diaSemana = alvo.getUTCDay(); // 0=domingo, no fuso comercial
    const fimDoDia = zonedDateTimeToUtc(dataIso, '23:59');

    // Farmacêuticos ativos (por padrão todos, menos quem se desativar).
    const farmaceuticos = await this.prisma.user.findMany({
      where: { tipo: 'farmaceutico', ativo: true },
      select: { id: true, nome: true, tratamento: true, crf: true },
    });

    if (farmaceuticos.length === 0) return [];

    const ids = farmaceuticos.map((f) => f.id);

    // Busca única: disponibilidade + blockouts + consultas do dia.
    const [disponibilidade, blockouts, consultas] = await Promise.all([
      this.prisma.availability.findMany({
        where: { farmaceuticoId: { in: ids }, diaSemana, ativo: true },
      }),
      this.prisma.availabilityBlockout.findMany({
        where: { farmaceuticoId: { in: ids }, inicio: { lte: fimDoDia }, fim: { gte: alvo } },
      }),
      this.prisma.consulta.findMany({
        where: {
          farmaceuticoId: { in: ids },
          data: alvo,
          status: { not: 'CANCELADA' },
        },
      }),
    ]);

    // Permite agendamento no mesmo dia, mas preserva uma antecedência mínima operacional.
    const agora = Date.now();
    const hojeIso = todayIso();
    const dataAnterior = dataIso < hojeIso;

    const resultado = farmaceuticos.map((farm) => {
      const minhasFaixas = disponibilidade.filter((d) => d.farmaceuticoId === farm.id);
      const meusBloqueios = blockouts.filter((b) => b.farmaceuticoId === farm.id);
      const minhasConsultas = consultas
        .filter((c) => c.farmaceuticoId === farm.id)
        .map((c) => ({ inicio: toMinutes(c.hora), fim: toMinutes(c.hora) + DURACAO_SLOT_MIN }));

      const horariosLivres: string[] = [];

      for (const faixa of minhasFaixas) {
        const inicio = toMinutes(faixa.horaInicio);
        const fim = toMinutes(faixa.horaFim);

        for (
          let slotInicio = inicio;
          slotInicio + DURACAO_SLOT_MIN <= fim;
          slotInicio += DURACAO_SLOT_MIN
        ) {
          const slotFim = slotInicio + DURACAO_SLOT_MIN;
          const slotInicioDate = zonedDateTimeToUtc(dataIso, fromMinutes(slotInicio));
          const slotFimDate = zonedDateTimeToUtc(dataIso, fromMinutes(slotFim));

          // O mesmo dia é permitido; slots que já começaram ou estão a menos de 30 min não são ofertados.
          if (dataAnterior || slotInicioDate.getTime() < agora + 30 * 60_000) continue;

          const bloqueado = meusBloqueios.some(
            (b) => b.inicio < slotFimDate && b.fim > slotInicioDate,
          );
          if (bloqueado) continue;

          const ocupado = minhasConsultas.some(
            (c) => c.inicio < slotFim && c.fim > slotInicio,
          );
          if (ocupado) continue;

          horariosLivres.push(fromMinutes(slotInicio));
        }
      }

      return {
        farmaceuticoId: farm.id,
        farmaceuticoNome: farm.nome,
        farmaceuticoTratamento: farm.tratamento ?? null,
        farmaceuticoCrf: farm.crf ?? null,
        horariosLivres,
      };
    });

    return resultado;
  }
}
