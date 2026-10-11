export function formatPrice(value: number): string {
  return `£${value}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
}

export function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}
