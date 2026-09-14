import i18n from '@/lib/i18n';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import type { AppointmentRow, AppointmentSegmentPhaseRow, AppointmentSegmentRow } from '@/lib/api/calendar';
import { COLOR_BG_MAP, COLOR_MAP, COLOR_TEXT_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import {
  formatSalonWallClock,
  getISOWeekNumber,
  getMonthShortLabel,
  minutesBetweenWallClock,
  toDateKey,
  toDateKeyFromSalonClock,
} from './date-utils';
import { EventItem, EventPhase, MonthData } from './types';

function staffLabel(staff: { first_name: string | null; last_name: string | null } | null): string {
  if (!staff) return i18n.t('calendar.unassignedStaff');
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || i18n.t('calendar.unassignedStaff');
}

function clientLabel(client: AppointmentRow['client']): string {
  if (!client) return i18n.t('calendar.unknownClient');
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || i18n.t('calendar.unknownClient');
}

function phaseMinutes(phase: AppointmentSegmentPhaseRow): number {
  const ms = new Date(phase.ends_at).getTime() - new Date(phase.starts_at).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** Client-facing occupancy: busy + free. Buffer is a staff lock, not visit duration. */
export function clientFacingPhases(segments: AppointmentSegmentRow[]): EventPhase[] {
  return segments
    .flatMap((segment) => segment.appointment_segment_phase ?? [])
    .filter((phase): phase is AppointmentSegmentPhaseRow & { phase_type: 'busy' | 'free' } => {
      return phase.phase_type === 'busy' || phase.phase_type === 'free';
    })
    .sort((a, b) => a.sequence - b.sequence || a.starts_at.localeCompare(b.starts_at))
    .map((phase): EventPhase => ({
      id: phase.id,
      phase_type: phase.phase_type,
      minutes: phaseMinutes(phase),
    }))
    .filter((phase) => phase.minutes > 0);
}

function headerVisitMinutes(appointment: AppointmentRow, phases: EventPhase[]): number {
  const header = minutesBetweenWallClock(appointment.start, appointment.end);
  if (header > 0) return header;
  return phases.reduce((sum, phase) => sum + phase.minutes, 0);
}

/** Combined appointment view — visit header is naive appointment.start/end. */
export function appointmentToEvent(appointment: AppointmentRow): EventItem {
  const segments = appointment.appointment_segment ?? [];
  const services = segments.map((segment) => segment.service).filter(Boolean);
  const label = services.map((service) => service!.name).join(', ') || i18n.t('calendar.untitledAppointment');
  const eventColor = mapTreatmentColorToEventColor(services[0]?.color ?? null, services[0]?.name);
  const first = segments[0];
  const staff = first?.staff ?? appointment.staff;
  const staffIds = [
    ...new Set(segments.map((segment) => segment.staff_id).filter((id): id is string => Boolean(id))),
  ];
  if (staffIds.length === 0 && staff?.id) staffIds.push(staff.id);
  const phases = clientFacingPhases(segments);
  const duration = headerVisitMinutes(appointment, phases);
  const scaledPhases =
    phases.length > 0
      ? phases
      : duration > 0
        ? [{ id: `${appointment.id}-busy`, phase_type: 'busy' as const, minutes: duration }]
        : [];

  return {
    id: appointment.id,
    appointmentId: appointment.id,
    label,
    color: COLOR_MAP[eventColor],
    bgColor: COLOR_BG_MAP[eventColor],
    textColor: COLOR_TEXT_MAP[eventColor],
    clientName: clientLabel(appointment.client),
    clientId: appointment.client?.id ?? appointment.client_id ?? null,
    staffName: staffLabel(staff),
    staffId: staff?.id ?? first?.staff_id ?? null,
    staffIds,
    startTime: formatSalonWallClock(appointment.start),
    endTime: formatSalonWallClock(appointment.end),
    startISO: appointment.start,
    endISO: appointment.end,
    phases: scaledPhases,
    canceled: isAppointmentCanceled(appointment),
  };
}

/** One calendar event per visit. Height comes from appointment.start/end, not segment buffer. */
export function appointmentToEvents(appointment: AppointmentRow): EventItem[] {
  return [appointmentToEvent(appointment)];
}

export const PX_PER_VISIT_MINUTE = 1.4;
const MIN_VISIT_BLOCK_HEIGHT = 32;
const MAX_LIST_VISIT_HEIGHT = 96;

export function visitDurationMinutes(event: Pick<EventItem, 'startISO' | 'endISO' | 'phases'>): number {
  const header = minutesBetweenWallClock(event.startISO, event.endISO);
  if (header > 0) return header;
  return event.phases.reduce((sum, phase) => sum + phase.minutes, 0);
}

/** Pixel height of a visit block from appointment.start/end (busy+free), never busy-only. */
export function visitBlockHeight(event: Pick<EventItem, 'startISO' | 'endISO' | 'phases'>, cap?: number): number {
  const minutes = visitDurationMinutes(event);
  const height = Math.max(MIN_VISIT_BLOCK_HEIGHT, minutes * PX_PER_VISIT_MINUTE);
  return cap ? Math.min(cap, height) : height;
}

export function listVisitBlockHeight(event: Pick<EventItem, 'startISO' | 'endISO' | 'phases'>): number {
  return visitBlockHeight(event, MAX_LIST_VISIT_HEIGHT);
}

/** Cache key for one calendar month. Must include shop + tenant so a location switch cannot reuse another shop's rows. */
export function monthCacheKey(companyId: string, locationId: string, year: number, monthIndex: number): string {
  return `${companyId}:${locationId}:${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

/** Drop one appointment from every cached month. Returns keys that actually changed. */
export function removeAppointmentFromMonthCache(
  cache: Map<string, AppointmentRow[]>,
  appointmentId: string
): string[] {
  const touched: string[] = [];
  cache.forEach((rows, key) => {
    const next = rows.filter((row) => row.id !== appointmentId);
    if (next.length !== rows.length) {
      cache.set(key, next);
      touched.push(key);
    }
  });
  return touched;
}

/** Replace or insert an appointment in a month that is already cached. */
export function upsertAppointmentInMonthCache(
  cache: Map<string, AppointmentRow[]>,
  monthKey: string,
  appointment: AppointmentRow
): void {
  const rows = cache.get(monthKey);
  if (!rows) return;
  cache.set(monthKey, [...rows.filter((row) => row.id !== appointment.id), appointment]);
}

export function groupAppointmentsByDateKey(
  appointments: AppointmentRow[],
  staffFilterId: string | null
): Record<string, EventItem[]> {
  const events = appointments.flatMap(appointmentToEvents);
  const filtered = staffFilterId
    ? events.filter((event) => event.staffIds.includes(staffFilterId) || event.staffId === staffFilterId)
    : events;

  const byDateKey: Record<string, EventItem[]> = {};

  filtered.forEach((event) => {
    const dateKey = toDateKeyFromSalonClock(event.startISO);
    if (!byDateKey[dateKey]) {
      byDateKey[dateKey] = [];
    }
    byDateKey[dateKey].push(event);
  });

  Object.values(byDateKey).forEach((dayEvents) => {
    dayEvents.sort((a, b) => a.startISO.localeCompare(b.startISO));
  });

  return byDateKey;
}

export function buildMonthData(
  year: number,
  monthIndex: number,
  eventsByDateKey: Record<string, EventItem[]>
): MonthData {
  const label = `${getMonthShortLabel(monthIndex)} ${year}`;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const firstDayIndex = (firstOfMonth.getDay() + 6) % 7;
  const startDate = new Date(year, monthIndex, 1 - firstDayIndex);

  const weeks = [];
  const inMonthKeys = new Set<string>();
  const events: Record<string, EventItem[]> = {};
  let firstDateKey = '';

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + weekIndex * 7);
    const weekNumber = getISOWeekNumber(weekStart);
    const days = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const inMonth = dayDate.getMonth() === monthIndex;
      const dateKey = toDateKey(dayDate);

      if (inMonth) {
        inMonthKeys.add(dateKey);
        if (!firstDateKey) {
          firstDateKey = dateKey;
        }
        if (eventsByDateKey[dateKey]) {
          events[dateKey] = eventsByDateKey[dateKey];
        }
      }

      days.push({
        date: dayDate.getDate(),
        inMonth,
        isSunday: dayDate.getDay() === 0,
        dateKey,
      });
    }

    weeks.push({ weekNumber, days });
  }

  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    label,
    year,
    monthIndex,
    weeks,
    events,
    inMonthKeys,
    firstDateKey,
  };
}
