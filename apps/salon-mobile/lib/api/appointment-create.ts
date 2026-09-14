import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { ServiceVariantPhase } from '@/lib/api/services';

export type CreateAppointmentSegment = {
  serviceId: string;
  serviceVariantId: string;
  staffId: string;
  price: number;
  phases: ServiceVariantPhase[];
  durationMinutes: number;
};

export type CreateAppointmentPayload = {
  start: Date;
  companyId: string;
  locationId: string;
  segments: CreateAppointmentSegment[];
  firstName: string;
  lastName: string;
  email: string;
  notes: string;
  clientId?: string;
};

async function functionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
      if (typeof body?.message === 'string') return body.message;
    } catch {
      // Body wasn't JSON — fall back to the generic message.
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Booking failed';
}

/**
 * Staff booking goes through folded v1 `appointment-create-staff`.
 * After the backend fold that slug is the new-table implementation
 * (was `appointment-create-staff-v2`). Payload is services / variants
 * only — no treatmentId / priceOptionId aliases.
 */
export async function createAppointment(payload: CreateAppointmentPayload): Promise<{ id?: string; clientId?: string }> {
  if (payload.segments.length === 0) {
    throw new Error('At least one service is required');
  }

  const primaryStaffId = payload.segments[0].staffId;
  const totalPrice = payload.segments.reduce((sum, segment) => sum + Number(segment.price), 0);

  const { data, error } = await supabase.functions.invoke('appointment-create-staff', {
    body: {
      start: payload.start.toISOString(),
      staffId: primaryStaffId,
      companyId: payload.companyId,
      locationId: payload.locationId,
      services: payload.segments.map((segment) => ({
        serviceId: segment.serviceId,
        serviceVariantId: segment.serviceVariantId,
        staffId: segment.staffId,
      })),
      price: totalPrice,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      notes: payload.notes,
      imageData: null,
    },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }

  return {
    id: data?.booking_id ?? data?.id,
    clientId: data?.client_id ?? data?.clientId,
  };
}
