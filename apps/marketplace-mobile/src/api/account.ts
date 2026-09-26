import { FunctionsHttpError } from '@supabase/supabase-js';

import { getSupabase } from '@/src/lib/supabase';

export type EmailStatus = { exists: boolean; hasPassword: boolean };

export type CompleteAccountInput = {
  firstName: string;
  lastName: string;
  /** E.164, e.g. +32496054389. */
  phone: string;
  password?: string;
};

export type CompleteAccountResult = { clientCount: number; appointmentCount: number };

/** Error with the Edge Function's `code` (e.g. WEAK_PASSWORD) when it sent one. */
export class AccountApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = (await error.context.json().catch(() => null)) as
        | { error?: string; code?: string }
        | null;
      throw new AccountApiError(payload?.error ?? error.message, payload?.code, error.context.status);
    }
    throw new AccountApiError(error.message);
  }
  if (data == null) throw new AccountApiError('Leeg antwoord van de server.');
  return data;
}

export function lookupEmail(email: string): Promise<EmailStatus> {
  return invoke<EmailStatus>('marketplace-auth-lookup', { email });
}

export function completeAccount(input: CompleteAccountInput): Promise<CompleteAccountResult> {
  return invoke<CompleteAccountResult>('marketplace-account-complete', { ...input });
}

export async function deleteAccount(): Promise<void> {
  await invoke<{ deleted: boolean }>('marketplace-account-delete', {});
}
