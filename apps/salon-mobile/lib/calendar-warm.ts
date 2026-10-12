import { monthCacheKey } from '@/components/calendar/calendar-data';
import { BASE_MONTH_INDEX, BASE_YEAR } from '@/components/calendar/constants';
import { addDays, addMonths, getOffsetForDate, getWeekStartMonday } from '@/components/calendar/date-utils';
import { fetchAppointmentsForMonth, fetchStaff, type AppointmentRow, type StaffMember } from '@/lib/api/calendar';
import { readPreferredCalendarView, type CalendarViewMode } from '@/lib/preferences';

export type CalendarWarm = {
  companyId: string;
  locationId: string;
  view: CalendarViewMode;
  staff: StaffMember[];
  months: Map<string, AppointmentRow[]>;
};

let warm: CalendarWarm | null = null;
let inflight: Promise<void> | null = null;
let inflightKey = '';

export function peekCalendarWarm(companyId: string | null, locationId: string | null): CalendarWarm | null {
  if (!warm || !companyId || !locationId) return null;
  return warm.companyId === companyId && warm.locationId === locationId ? warm : null;
}

export function clearCalendarWarm() {
  warm = null;
  inflight = null;
  inflightKey = '';
}

/** Load the saved view, staff, and this week's appointments before the calendar is shown. */
export function warmCalendar(companyId: string, locationId: string): Promise<void> {
  if (peekCalendarWarm(companyId, locationId)) return Promise.resolve();
  const key = `${companyId}:${locationId}`;
  if (inflight && inflightKey === key) return inflight;
  inflightKey = key;
  const task = (async () => {
    const view = await readPreferredCalendarView();
    const today = new Date();
    const offsets = new Set<number>([getOffsetForDate(today)]);
    const start = view === 'dayGrid' ? today : getWeekStartMonday(today);
    const days = view === 'dayGrid' ? 1 : 7;
    for (let index = 0; index < days; index += 1) {
      offsets.add(getOffsetForDate(addDays(start, index)));
    }
    const months = new Map<string, AppointmentRow[]>();
    const [staff, ...loaded] = await Promise.all([
      fetchStaff(companyId, locationId),
      ...[...offsets].map(async (offset) => {
        const { year, monthIndex } = addMonths(BASE_YEAR, BASE_MONTH_INDEX, offset);
        const rows = await fetchAppointmentsForMonth(companyId, locationId, year, monthIndex);
        return { key: monthCacheKey(companyId, locationId, year, monthIndex), rows };
      }),
    ]);
    for (const month of loaded) months.set(month.key, month.rows);
    warm = { companyId, locationId, view, staff, months };
  })();
  inflight = task;
  void task.finally(() => {
    if (inflight === task) inflight = null;
  });
  return task;
}
