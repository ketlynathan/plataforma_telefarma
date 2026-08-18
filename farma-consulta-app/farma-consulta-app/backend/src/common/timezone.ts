export const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

/**
 * Fuso comercial da plataforma. Pode ser substituído por APP_TIMEZONE no Render,
 * mas não é inferido do celular de cada usuário.
 */
export const APP_TIME_ZONE = process.env.APP_TIMEZONE?.trim() || DEFAULT_TIME_ZONE;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function assertValidTimeZone(timeZone: string): string {
  const normalized = timeZone.trim();
  if (!isValidTimeZone(normalized)) throw new Error(`Fuso horário inválido: ${timeZone}`);
  return normalized;
}

function partsInTimeZone(date: Date, timeZone = APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function offsetAt(date: Date, timeZone = APP_TIME_ZONE): number {
  const parts = partsInTimeZone(date, timeZone);
  const displayedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return displayedAsUtc - date.getTime();
}

/** Converte uma data/hora de negócio (ex.: 2026-08-18 13:00 em Brasília) para UTC. */
export function zonedDateTimeToUtc(dateIso: string, hhmm: string, timeZone = APP_TIME_ZONE): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  return new Date(guess.getTime() - offsetAt(guess, timeZone));
}

/** Data sem horário usada pelo campo DATE do Prisma, sempre normalizada à meia-noite UTC. */
export function dateOnlyToUtc(dateIso: string): Date {
  return new Date(`${dateIso}T00:00:00.000Z`);
}

export function isoDateFromDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(timeZone = APP_TIME_ZONE): string {
  const parts = partsInTimeZone(new Date(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatTimeInZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateInAppZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return formatDateInZone(date, timeZone);
}

export function formatTimeInAppZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return formatTimeInZone(date, timeZone);
}

export function formatDateInZone(date: Date, timeZone = APP_TIME_ZONE): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
