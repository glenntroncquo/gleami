/** Monday-first display order. Values are DB day_of_week (0 = Sunday). */
export const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

const DEFAULT_START = 9 * 60;
const DEFAULT_END = 17 * 60;
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const BLOCK_LENGTH = 4 * 60;
const MIN_BLOCK = 60;

export type ScheduleSlot = { key: string; id: string | null; start: number; end: number };

export type DayDraft = {
  working: boolean;
  /** Every rule id loaded for this day, so a removed block is deleted on save. */
  ruleIds: string[];
  slots: ScheduleSlot[];
};

export type DayIssue = 'range' | 'slot' | null;

let keySeq = 0;

export function newSlotKey() {
  keySeq += 1;
  return `slot-${keySeq}`;
}

export function emptyDay(): DayDraft {
  return {
    working: false,
    ruleIds: [],
    slots: [{ key: 'default', id: null, start: DEFAULT_START, end: DEFAULT_END }],
  };
}

export function minutesFromClock(hours: number, minutes: number) {
  return hours * 60 + minutes;
}

export function clockFromMinutes(value: number) {
  const minutesInDay = 24 * 60;
  const wrapped = ((value % minutesInDay) + minutesInDay) % minutesInDay;
  return { hours: Math.floor(wrapped / 60), minutes: wrapped % 60 };
}

export function formatClock(value: number) {
  const { hours, minutes } = clockFromMinutes(value);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function sortSlots(slots: ScheduleSlot[]) {
  return [...slots].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function dayFromRules(rules: { id: string; start: number; end: number }[]): DayDraft {
  const sorted = [...rules].sort((a, b) => a.start - b.start || a.end - b.end);
  if (sorted.length === 0) return emptyDay();
  return {
    working: true,
    ruleIds: sorted.map((slot) => slot.id),
    slots: sorted.map((slot) => ({ key: slot.id, id: slot.id, start: slot.start, end: slot.end })),
  };
}

export function desiredSlots(day: DayDraft): { id: string | null; start: number; end: number }[] {
  if (!day.working) return [];
  return sortSlots(day.slots).map(({ id, start, end }) => ({ id, start, end }));
}

export function dayIssue(day: DayDraft): DayIssue {
  if (!day.working) return null;
  if (day.slots.length === 0) return 'slot';
  if (day.slots.some((slot) => slot.end <= slot.start)) return 'range';
  const sorted = sortSlots(day.slots);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].start < sorted[index - 1].end) return 'slot';
  }
  return null;
}

function fits(start: number, end: number): { start: number; end: number } | null {
  if (end - start < MIN_BLOCK) return null;
  return { start, end };
}

/** Next block prefers the evening, then the morning, and only then a gap between blocks. */
export function nextBlock(slots: ScheduleSlot[]): { start: number; end: number } | null {
  const sorted = sortSlots(slots);
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  if (last) {
    const after = fits(last.end, Math.min(DAY_END, last.end + BLOCK_LENGTH));
    if (after) return after;
  }
  if (first) {
    const end = first.start;
    const before = fits(Math.max(DAY_START, end - BLOCK_LENGTH), end);
    if (before) return before;
  }
  let best: { start: number; end: number } | null = null;
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index].end;
    const end = Math.min(sorted[index + 1].start, start + BLOCK_LENGTH);
    const gap = fits(start, end);
    if (gap && (!best || gap.end - gap.start > best.end - best.start)) best = gap;
  }
  return best;
}

export function enableDay(day: DayDraft, template: { start: number; end: number } | null): DayDraft {
  const only = day.slots.length === 1 ? day.slots[0] : null;
  const untouched =
    day.ruleIds.length === 0 &&
    only != null &&
    only.id == null &&
    only.start === DEFAULT_START &&
    only.end === DEFAULT_END;
  if (day.slots.length === 0) {
    return {
      ...day,
      working: true,
      slots: [{ key: newSlotKey(), id: null, start: template?.start ?? DEFAULT_START, end: template?.end ?? DEFAULT_END }],
    };
  }
  if (untouched && template) {
    return { ...day, working: true, slots: [{ ...only, start: template.start, end: template.end }] };
  }
  return { ...day, working: true };
}

export function hoursTemplate(days: Record<number, DayDraft>, exceptDay: number): { start: number; end: number } | null {
  for (const day of DISPLAY_DAYS) {
    if (day === exceptDay) continue;
    const state = days[day];
    const first = state ? sortSlots(state.slots)[0] : undefined;
    if (state?.working && first && dayIssue(state) == null) {
      return { start: first.start, end: first.end };
    }
  }
  return null;
}

export function upcomingAbsences<T extends { starts_at: string; ends_at: string }>(rows: T[], now: Date): T[] {
  return rows
    .filter((row) => new Date(row.ends_at).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}
