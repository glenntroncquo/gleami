import { formatInSalonZone, zonedWallTimeToUtc } from "../../time/salon-timezone.ts";

const MS_PER_HOUR = 60 * 60 * 1000;

/** Wide UTC band so a later per-location 24–25h filter cannot miss a shop TZ. */
export function reminderCandidateFetchWindow(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(now.getTime() + 20 * MS_PER_HOUR),
    end: new Date(now.getTime() + 30 * MS_PER_HOUR),
  };
}

export function isInReminderWindow(
  appointmentStart: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const t = appointmentStart.getTime();
  return t >= windowStart.getTime() && t < windowEnd.getTime();
}

function wallDateTime(now: Date, timeZone: string): { date: string; time: string } {
  return {
    date: formatInSalonZone(now, "yyyy-MM-dd", timeZone),
    time: `${formatInSalonZone(now, "HH:mm", timeZone)}:00`,
  };
}

function addHoursToWall(
  dateStr: string,
  timeStr: string,
  hours: number,
): { date: string; time: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute, second] = timeStr.split(":").map(Number);
  const later = new Date(Date.UTC(year, month - 1, day, hour, minute, second) + hours * MS_PER_HOUR);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${later.getUTCFullYear()}-${pad(later.getUTCMonth() + 1)}-${pad(later.getUTCDate())}`,
    time: `${pad(later.getUTCHours())}:${pad(later.getUTCMinutes())}:${pad(later.getUTCSeconds())}`,
  };
}

/**
 * 24–25 hours of shop-local wall time from `now`, as UTC instants.
 * Replaces the hardcoded Europe/Amsterdam window in the reminder edge.
 */
export function localReminderWindowUtc(
  now: Date,
  timeZone: string,
): { start: Date; end: Date } {
  const wall = wallDateTime(now, timeZone);
  const startWall = addHoursToWall(wall.date, wall.time, 24);
  const endWall = addHoursToWall(wall.date, wall.time, 25);
  return {
    start: zonedWallTimeToUtc(startWall.date, startWall.time, timeZone),
    end: zonedWallTimeToUtc(endWall.date, endWall.time, timeZone),
  };
}
