export const SALON_TIMEZONE = "Europe/Brussels";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function padTime(time: string): string {
  const [hours = "00", minutes = "00", seconds = "00"] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0").slice(0, 2)}`;
}

function parseWallParts(dateStr: string, timeStr: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute, second] = padTime(timeStr).split(":").map(Number);
  return { year, month, day, hour, minute, second };
}

/** Last Sunday calendar day of a 1-based month, in UTC. */
function lastSundayDay(year: number, month1Based: number): number {
  const lastOfMonth = new Date(Date.UTC(year, month1Based, 0));
  return lastOfMonth.getUTCDate() - lastOfMonth.getUTCDay();
}

/** EU DST start: last Sunday of March 01:00 UTC. */
function euDstStartUtcMs(year: number): number {
  return Date.UTC(year, 2, lastSundayDay(year, 3), 1, 0, 0, 0);
}

/** EU DST end: last Sunday of October 01:00 UTC. */
function euDstEndUtcMs(year: number): number {
  return Date.UTC(year, 9, lastSundayDay(year, 10), 1, 0, 0, 0);
}

/**
 * Europe/Brussels offset from UTC, without Intl timezone data.
 * CEST +2 from last Sunday of March 01:00 UTC until last Sunday of October 01:00 UTC;
 * CET +1 otherwise.
 */
export function brusselsOffsetHoursAtUtc(utcMs: number): 1 | 2 {
  const year = new Date(utcMs).getUTCFullYear();
  if (utcMs >= euDstStartUtcMs(year) && utcMs < euDstEndUtcMs(year)) return 2;
  return 1;
}

function wallAsUtcMs(parts: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
}

function usesBrusselsOffset(timeZone: string): boolean {
  return timeZone === SALON_TIMEZONE || timeZone === "Europe/Amsterdam";
}

function intlParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function intlZonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const parts = parseWallParts(dateStr, timeStr);
  const wallAsUtc = wallAsUtcMs(parts);
  const offsetOf = (utcMs: number): number => {
    const asZone = intlParts(new Date(utcMs), timeZone);
    return wallAsUtcMs(asZone) - utcMs;
  };
  const first = wallAsUtc - offsetOf(wallAsUtc);
  const second = wallAsUtc - offsetOf(first);
  return new Date(second);
}

/** Interpret a salon-local wall clock (date + time) as a UTC instant. */
export function zonedWallTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = SALON_TIMEZONE,
): Date {
  if (!usesBrusselsOffset(timeZone)) {
    return intlZonedWallTimeToUtc(dateStr, timeStr, timeZone);
  }
  const parts = parseWallParts(dateStr, timeStr);
  const wallUtcMs = wallAsUtcMs(parts);
  const asCestMs = wallUtcMs - 2 * 3_600_000;
  if (brusselsOffsetHoursAtUtc(asCestMs) === 2) {
    return new Date(asCestMs);
  }
  return new Date(wallUtcMs - 1 * 3_600_000);
}

function brusselsWallParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
} {
  const offsetHours = brusselsOffsetHoursAtUtc(date.getTime());
  const wall = new Date(date.getTime() + offsetHours * 3_600_000);
  return {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    weekday: WEEKDAYS[wall.getUTCDay()]!,
  };
}

export function formatInSalonZone(
  date: Date,
  pattern: "yyyy-MM-dd" | "HH:mm" | "EEEE",
  timeZone: string = SALON_TIMEZONE,
): string {
  if (!usesBrusselsOffset(timeZone)) {
    if (pattern === "EEEE") {
      return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(date);
    }
    const parts = intlParts(date, timeZone);
    const month = String(parts.month).padStart(2, "0");
    const day = String(parts.day).padStart(2, "0");
    const hour = String(parts.hour).padStart(2, "0");
    const minute = String(parts.minute).padStart(2, "0");
    return pattern === "yyyy-MM-dd" ? `${parts.year}-${month}-${day}` : `${hour}:${minute}`;
  }

  const parts = brusselsWallParts(date);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");

  switch (pattern) {
    case "yyyy-MM-dd":
      return `${parts.year}-${month}-${day}`;
    case "HH:mm":
      return `${hour}:${minute}`;
    case "EEEE":
      return parts.weekday;
  }
}
