import { mockAvailability, mockCreateAppointment } from '@/src/api/mock-booking';
import type {
  AvailabilityDays,
  AvailabilityRequest,
  BookingErrorKey,
  CreateAppointmentRequest,
  CreateAppointmentResult,
} from '@/src/api/booking-types';
import { useMocks } from '@/src/config';
import { t } from '@/src/i18n';
import { getSupabase } from '@/src/lib/supabase';

export class BookingError extends Error {
  readonly key: BookingErrorKey;

  constructor(key: BookingErrorKey, message: string) {
    super(message);
    this.name = 'BookingError';
    this.key = key;
  }
}

/** Keys the booking RPC returns when the slot went to someone else mid-flow. */
const TAKEN_KEYS = new Set(['BOOKING_SLOT_TAKEN', 'CONFLICT_DETECTED', 'CONCURRENCY_RETRY']);

/**
 * Edge errors arrive as `FunctionsHttpError`, whose message is always the same
 * generic line. The key we care about is in the JSON body on `error.context`.
 */
async function toBookingError(error: { message: string; context?: unknown }): Promise<BookingError> {
  const response = error.context;
  let key = '';
  if (response instanceof Response) {
    try {
      const body = (await response.clone().json()) as { message?: string; code?: string };
      key = body.code ?? body.message ?? '';
    } catch {
      key = '';
    }
  }
  if (TAKEN_KEYS.has(key)) return new BookingError('SLOT_TAKEN', t('booking.errors.slotTaken'));
  if (__DEV__) console.warn('[booking]', key || error.message);
  return new BookingError('UNKNOWN', t('booking.errors.generic'));
}

export async function listAvailability(request: AvailabilityRequest): Promise<AvailabilityDays> {
  if (useMocks) return mockAvailability(request);
  const { companyId, locationId, services, startDate, endDate, staffIds } = request;
  const { data, error } = await getSupabase().functions.invoke<{ dates: AvailabilityDays }>(
    'availability-list',
    {
      body: {
        companyId,
        location_id: locationId,
        locationId,
        services,
        startDate,
        endDate,
        ...(staffIds?.length ? { staffIds } : {}),
      },
    },
  );
  if (error) throw await toBookingError(error);
  return data?.dates ?? {};
}

export async function createAppointment(
  request: CreateAppointmentRequest,
): Promise<CreateAppointmentResult> {
  if (useMocks) return mockCreateAppointment(request);
  const { companyId, locationId, ...rest } = request;
  const { data, error } = await getSupabase().functions.invoke<{
    booking_id: string;
    total_duration: number;
  }>('appointment-create', {
    body: { ...rest, companyId, location_id: locationId, locationId },
  });
  if (error) throw await toBookingError(error);
  if (!data?.booking_id) throw new BookingError('UNKNOWN', t('booking.errors.generic'));
  return { bookingId: data.booking_id, totalDuration: data.total_duration ?? 0 };
}
