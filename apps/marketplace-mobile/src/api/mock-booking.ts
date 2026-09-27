/**
 * EXAMPLE DATA for the booking flow. Toggled with EXPO_PUBLIC_USE_MOCKS=1.
 * Shapes match `availability-list` and `appointment-create`.
 */
import type {
  AvailabilityDays,
  AvailabilityRequest,
  AvailabilitySlot,
  CreateAppointmentRequest,
  CreateAppointmentResult,
} from '@/src/api/booking-types';
import { dateKey, parseDateKey } from '@/src/lib/booking-date';

const STAFF = [
  { id: '00000000-0000-4000-8000-00000000f001', first_name: 'Nora', last_name: 'B.' },
  { id: '00000000-0000-4000-8000-00000000f002', first_name: 'Sam', last_name: 'D.' },
] as const;

const OPENS_AT = 9;
const CLOSES_AT = 18;
const STEP_MINUTES = 30;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function slotAt(day: Date, minutes: number, staff: (typeof STAFF)[number]): AvailabilitySlot {
  const start = new Date(day);
  start.setHours(0, minutes, 0, 0);
  const end = new Date(start.getTime() + 45 * 60_000);
  const clock = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return {
    staff_id: staff.id,
    first_name: staff.first_name,
    last_name: staff.last_name,
    image_path: null,
    start_time: clock(start),
    end_time: clock(end),
    available_start: start.toISOString(),
    available_end: end.toISOString(),
  };
}

export async function mockAvailability(request: AvailabilityRequest): Promise<AvailabilityDays> {
  await wait(260);
  const days: AvailabilityDays = {};
  const now = new Date();
  let cursor = parseDateKey(request.startDate);
  const last = parseDateKey(request.endDate);

  while (cursor <= last) {
    const key = dateKey(cursor);
    const weekday = cursor.getDay();
    // Closed Sundays, and Mondays every other week, so empty days are visible.
    const closed = weekday === 0 || (weekday === 1 && cursor.getDate() % 2 === 0);
    if (!closed) {
      const staff: AvailabilityDays[string]['staff'] = {};
      for (const [index, member] of STAFF.entries()) {
        const slots: AvailabilitySlot[] = [];
        for (let hour = OPENS_AT + index; hour < CLOSES_AT; hour += 1) {
          for (let minute = 0; minute < 60; minute += STEP_MINUTES) {
            const slot = slotAt(cursor, hour * 60 + minute, member);
            if (new Date(slot.available_start) > now) slots.push(slot);
          }
        }
        if (slots.length > 0) {
          staff[member.id] = {
            first_name: member.first_name,
            last_name: member.last_name,
            image_path: null,
            slots,
          };
        }
      }
      if (Object.keys(staff).length > 0) {
        days[key] = {
          dayName: new Intl.DateTimeFormat('nl-BE', { weekday: 'long' }).format(cursor),
          staff,
        };
      }
    }
    cursor = new Date(cursor.getTime() + 24 * 3600_000);
  }
  return days;
}

export async function mockCreateAppointment(
  request: CreateAppointmentRequest,
): Promise<CreateAppointmentResult> {
  await wait(600);
  return {
    bookingId: '00000000-0000-4000-8000-0000000000bb',
    totalDuration: request.services.length * 30,
  };
}
