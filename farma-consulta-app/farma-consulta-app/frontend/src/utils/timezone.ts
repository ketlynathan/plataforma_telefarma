const APP_TIMEZONE = import.meta.env.VITE_APP_TIMEZONE?.trim() || 'America/Sao_Paulo';

function partsInTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
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

function offsetAt(date: Date): number {
  const parts = partsInTimeZone(date);
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

export function appDateTimeToDate(dateIso: string, hhmm: string): Date {
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  return new Date(guess.getTime() - offsetAt(guess));
}

export function appTodayIso(): string {
  const parts = partsInTimeZone(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export { APP_TIMEZONE };
