import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

const SOCIAL_PROVIDERS = new Set(['google', 'apple']);

export function hasDeletionRequest(user: User | null | undefined): boolean {
  const requestedAt = user?.user_metadata?.deletion_requested_at;
  return typeof requestedAt === 'string' && requestedAt.length > 0;
}

/**
 * Staff account deletion is a *request*, not a hard delete.
 * There is no delete-account edge function or public RPC — do not invent one.
 * We only stamp auth `user_metadata` so support can process the signed-in
 * staff user without wiping salon/company data.
 *
 * Email/password is the only staff sign-in today. When Google/Apple Sign In
 * land, revoke or unlink those identities here (do not add SIWA in this PR)
 * before or after recording the request.
 */
export async function requestStaffAccountDeletion(user: User): Promise<void> {
  const identities = user.identities ?? [];
  const socialIdentities = identities.filter((identity) => SOCIAL_PROVIDERS.has(identity.provider));
  if (socialIdentities.length > 0) {
    // Hook for future Google / Apple Sign In: revoke provider session / unlink
    // identity, then continue to record the request below.
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      deletion_requested_at: new Date().toISOString(),
      deletion_requested_from: 'staff-app',
    },
  });

  if (error) throw error;
}
