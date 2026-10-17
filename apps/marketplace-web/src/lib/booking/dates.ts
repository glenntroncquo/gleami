export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
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

export function weekdayLabel(key: string, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    parseDateKey(key),
  );
  return label.replace(".", "");
}

export function dayNumber(key: string): string {
  return String(parseDateKey(key).getDate());
}
