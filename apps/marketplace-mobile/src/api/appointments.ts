import { FunctionsHttpError } from '@supabase/supabase-js';

import { mockMyAppointments } from '@/src/api/mock-appointments';
import { useMocks } from '@/src/config';
import { getSupabase } from '@/src/lib/supabase';

export type MyAppointment = {
  id: string;
  /** Naive UTC wall time as stored in the database, e.g. "2026-09-28T14:00:00". */
  startsAt: string;
  endsAt: string;
  status: string | null;
  isCanceled: boolean;
  price: number;
  locationId: string;
  locationName: string;
  locationSlug: string;
  locationCity: string | null;
  locationImageUrl: string | null;
  /** IANA timezone of the salon, e.g. "Europe/Brussels". Render times in this zone. */
  locationTimezone: string | null;
  services: string[];
};

type MyAppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string | null;
  is_canceled: boolean;
  price: number;
  location_id: string;
  location_name: string;
  location_slug: string;
  location_city: string | null;
  location_image_url: string | null;
  location_timezone: string | null;
  services: string[] | null;
};

export class AppointmentsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AppointmentsApiError';
  }
}

function toMyAppointment(row: MyAppointmentRow): MyAppointment {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    isCanceled: row.is_canceled,
    price: Number(row.price) || 0,
    locationId: row.location_id,
    locationName: row.location_name,
    locationSlug: row.location_slug,
    locationCity: row.location_city,
    locationImageUrl: row.location_image_url,
    locationTimezone: row.location_timezone ?? null,
    services: row.services ?? [],
  };
}

/**
 * appointment.start/end are naive UTC wall time, and the RPC serializes them
 * without an offset. Reading the string as UTC yields the correct instant;
 * format it in the salon's timezone (MyAppointment.locationTimezone).
 */
export function appointmentInstant(naiveUtc: string): Date {
  const trimmed = naiveUtc.trim();
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  return new Date(hasOffset ? trimmed : `${trimmed}Z`);
}

/**
 * Own appointment history via the column-safe SECURITY DEFINER RPC — there is
 * deliberately no customer SELECT policy on appointment (it carries
 * staff_notes), so never read the table directly here. The caller's user JWT
 * is the identity; there is nothing to scope in the arguments.
 */
export async function listMyAppointments(): Promise<MyAppointment[]> {
  if (useMocks) return mockMyAppointments();
  const { data, error } = await getSupabase().rpc('marketplace_my_appointments', { p_limit: 100 });
  if (error) throw new AppointmentsApiError(error.message);
  return ((data ?? []) as MyAppointmentRow[]).map(toMyAppointment);
}

export async function cancelMyAppointment(appointmentId: string): Promise<void> {
  if (useMocks) return;
  const { error } = await getSupabase().functions.invoke('marketplace-appointment-cancel', {
    body: { appointmentId },
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new AppointmentsApiError(payload?.error ?? error.message, error.context.status);
    }
    throw new AppointmentsApiError(error.message);
  }
}
