export type AvailabilityRule = {
  staff_id: string; day_of_week: number; start_time: string; end_time: string;
  effective_from: string | null; effective_to: string | null;
};
export type AvailabilityException = {
  staff_id: string; starts_at: string; ends_at: string;
  kind: 'unavailable' | 'available_addition';
};
export type AvailabilityData = { rules: AvailabilityRule[]; exceptions: AvailabilityException[] };
type Interval = { start: number; end: number };
const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };

/** Use the same local schedule clock as the mobile staff schedule editor. */
export function availableIntervals(data: AvailabilityData, staffId: string, dateKey: string): Interval[] {
  const day = new Date(dateKey + 'T00:00:00');
  const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1);
  let intervals = data.rules.filter(rule => rule.staff_id === staffId && rule.day_of_week === day.getDay()
    && (!rule.effective_from || rule.effective_from.slice(0, 10) <= dateKey)
    && (!rule.effective_to || rule.effective_to.slice(0, 10) >= dateKey))
    .map(rule => ({ start: minutes(rule.start_time), end: minutes(rule.end_time) }));
  const exceptions = data.exceptions.filter(e => e.staff_id === staffId && new Date(e.starts_at) < nextDay && new Date(e.ends_at) > day)
    .map(e => {
      const start = new Date(e.starts_at); const end = new Date(e.ends_at);
      return { kind: e.kind, start: start <= day ? 0 : start.getHours() * 60 + start.getMinutes(), end: end >= nextDay ? 1440 : end.getHours() * 60 + end.getMinutes() + end.getSeconds() / 60 };
    });
  intervals.push(...exceptions.filter(e => e.kind === 'available_addition'));
  for (const block of exceptions.filter(e => e.kind === 'unavailable')) {
    intervals = intervals.flatMap(slot => block.end <= slot.start || block.start >= slot.end ? [slot] : [
      { start: slot.start, end: Math.min(slot.end, block.start) },
      { start: Math.max(slot.start, block.end), end: slot.end },
    ].filter(slot => slot.end > slot.start));
  }
  return intervals.filter(slot => slot.end > slot.start);
}

/** Complement of the combined working hours; all-staff is unavailable only when nobody works. */
export function unavailableIntervals(data: AvailabilityData, staffIds: string[], dateKey: string, start: number, end: number): Interval[] {
  const available = staffIds.flatMap(id => availableIntervals(data, id, dateKey)).sort((a, b) => a.start - b.start);
  const gaps: Interval[] = [];
  let cursor = start;
  for (const slot of available) {
    if (slot.end <= cursor || slot.start >= end) continue;
    if (slot.start > cursor) gaps.push({ start: cursor, end: Math.min(slot.start, end) });
    cursor = Math.max(cursor, Math.min(slot.end, end));
  }
  if (cursor < end) gaps.push({ start: cursor, end });
  return gaps;
}
