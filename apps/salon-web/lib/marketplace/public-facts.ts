import type { MarketplaceOpeningHour } from "./api";

const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function clockTime(value: string): string | null {
  const match = CLOCK_TIME.exec(value);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

export type HourDraft = {
  day: number;
  opens: string;
  closes: string;
};

export function emptyWeek(): HourDraft[] {
  return [1, 2, 3, 4, 5, 6, 7].map((day) => ({ day, opens: "", closes: "" }));
}

export function weekFromHours(hours: MarketplaceOpeningHour[]): HourDraft[] {
  const byDay = new Map(hours.map((hour) => [hour.day, hour]));
  return emptyWeek().map((day) => {
    const saved = byDay.get(day.day);
    return {
      day: day.day,
      opens: saved?.opens ?? "",
      closes: saved?.closes ?? "",
    };
  });
}

export function normalizePhone(
  value: string,
): { ok: true; value: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 40 || !/^[+0-9][0-9 ()\-.]{5,39}$/.test(trimmed)) {
    return { ok: false };
  }
  return { ok: true, value: trimmed };
}

export function normalizePublicUrl(
  value: string,
): { ok: true; value: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 300) return { ok: false };
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false };
  }
}

/** Empty week saves as []. A week with at least one open day saves all seven. */
export function openingHoursForSave(
  days: HourDraft[],
): { ok: true; value: MarketplaceOpeningHour[] } | { ok: false } {
  const rows: MarketplaceOpeningHour[] = [];
  let anyOpen = false;
  for (const day of days) {
    const opens = day.opens.trim();
    const closes = day.closes.trim();
    if (!opens && !closes) {
      rows.push({ day: day.day, opens: null, closes: null });
      continue;
    }
    const openTime = clockTime(opens);
    const closeTime = clockTime(closes);
    if (!openTime || !closeTime || openTime >= closeTime) return { ok: false };
    anyOpen = true;
    rows.push({ day: day.day, opens: openTime, closes: closeTime });
  }
  return { ok: true, value: anyOpen ? rows : [] };
}
