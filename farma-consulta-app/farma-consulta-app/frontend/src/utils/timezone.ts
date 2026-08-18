const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE?.trim() || 'America/Sao_Paulo';

function partsInTimeZone(date: Date, timeZone = APP_TIMEZONE) {
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

function offsetAt(date: Date, timeZone = APP_TIMEZONE): number {
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

export function appDateTimeToDate(dateIso: string, hhmm: string, timeZone = APP_TIMEZONE): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  return new Date(guess.getTime() - offsetAt(guess, timeZone));
}

export function appTodayIso(timeZone = APP_TIMEZONE): string {
  const parts = partsInTimeZone(new Date(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDateInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function formatTimeInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
}

export function consultationInstant(data: string, hora: string, agendaTimezone?: string, agendadoEmUtc?: string | null): Date {
  return agendadoEmUtc ? new Date(agendadoEmUtc) : appDateTimeToDate(data.slice(0, 10), hora, agendaTimezone);
}

export function formatConsultationTimes(data: string, hora: string, agendaTimezone: string | undefined, userTimezone: string | undefined, agendadoEmUtc?: string | null) {
  const agendaZone = agendaTimezone || APP_TIMEZONE;
  const userZone = userTimezone || APP_TIMEZONE;
  const instant = consultationInstant(data, hora, agendaZone, agendadoEmUtc);
  return {
    agendaDate: formatDateInZone(instant, agendaZone),
    agendaTime: formatTimeInZone(instant, agendaZone),
    userDate: formatDateInZone(instant, userZone),
    userTime: formatTimeInZone(instant, userZone),
    agendaTimezone: agendaZone,
    userTimezone: userZone,
  };
}

export const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'Brasília, São Paulo, Rio de Janeiro (UTC−03:00)' },
  { value: 'America/Fortaleza', label: 'Nordeste (UTC−03:00)' },
  { value: 'America/Belem', label: 'Pará e Amapá (UTC−03:00)' },
  { value: 'America/Manaus', label: 'Manaus e Amazonas (UTC−04:00)' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (UTC−04:00)' },
  { value: 'America/Porto_Velho', label: 'Rondônia (UTC−04:00)' },
  { value: 'America/Boa_Vista', label: 'Roraima (UTC−04:00)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC−05:00)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−02:00)' },
] as const;

export { APP_TIMEZONE };
