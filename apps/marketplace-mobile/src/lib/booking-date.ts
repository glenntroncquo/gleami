/**
 * Day keys for the availability calendar. `availability-list` keys its response
 * by yyyy-MM-dd in the salon's timezone and pre-formats every slot's clock time,
 * so this file only ever builds and labels day keys — never times.
 */

const LOCALE = 'nl-BE';

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Noon, so daylight-saving shifts can never move the date. */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}

export function dayKeysFrom(start: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => dateKey(addDays(start, index)));
}

/** "ma", "di", … */
export function weekdayLabel(key: string): string {
  const label = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(parseDateKey(key));
  return label.replace('.', '');
}

export function dayOfMonth(key: string): string {
  return String(parseDateKey(key).getDate());
}

/** "september 2026" */
export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(parseDateKey(key));
}

/** "zondag 27 september" */
export function longDateLabel(key: string): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    parseDateKey(key),
  );
}
