export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function addDaysToYmd(ymd: string, days: number): string {
  const match = ymd.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) throw new Error('ymd must use YYYYMMDD format');

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('');
}

export function formatDateYmd(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}${get('month')}${get('day')}`;
}

export function formatDateTimeOffset(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMinutes = Math.round((localAsUtcMs - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHour = Math.floor(absOffsetMinutes / 60).toString().padStart(2, '0');
  const offsetMinute = (absOffsetMinutes % 60).toString().padStart(2, '0');

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get(
    'second',
  )}${sign}${offsetHour}:${offsetMinute}`;
}
