import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type CancelAppointmentPayload = {
  appointmentId: string;
  clientId: string;
  companyId: string;
  locationId?: string | null;
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
  return 'Cancel failed';
}

/**
 * Staff cancel goes through folded v1 `appointment-cancel` with the session JWT.
 * Do not write `is_canceled` from the client — that skips confirmation mail.
 */
export async function cancelAppointment(payload: CancelAppointmentPayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke('appointment-cancel', {
    headers: payload.locationId ? { 'x-location-id': payload.locationId } : undefined,
    body: {
      appointmentId: payload.appointmentId,
      clientId: payload.clientId,
      companyId: payload.companyId,
      ...(payload.locationId ? { locationId: payload.locationId } : {}),
    },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }

  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error);
  }
}
