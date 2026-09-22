import type { EventItem } from './types';

export function timelineMinutes(iso: string, dateKey: string): number {
  const [date, clock = '00:00'] = iso.split('T');
  const [hours, minutes] = clock.split(':').map(Number);
  const day = (value: string) => {
    const [year, month, date] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return (day(date) - day(dateKey)) / 86400000 * 1440 + hours * 60 + minutes;
}

/** Connected overlap groups share equal-width lanes; touching visits do not overlap. */
export function layoutTimelineEvents(events: EventItem[], dateKey: string) {
  const items = events.filter(event => !event.canceled).map(event => ({
    event, start: Math.max(0, timelineMinutes(event.startISO, dateKey)),
    end: Math.min(1440, timelineMinutes(event.endISO, dateKey)), lane: 0, lanes: 1,
  })).filter(item => item.end > item.start).sort((a, b) => a.start - b.start || b.end - a.end);
  let group: typeof items = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const finish = () => group.forEach(item => { item.lanes = ends.length; });
  for (const item of items) {
    if (item.start >= groupEnd) { finish(); group = []; ends = []; }
    let lane = ends.findIndex(end => end <= item.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = item.end;
    item.lane = lane;
    group.push(item);
    groupEnd = Math.max(...ends);
  }
  finish();
  return items;
}
