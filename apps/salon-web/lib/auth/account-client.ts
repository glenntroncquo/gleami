import { createClient } from "@/lib/supabase/client";
import {
  destinationFromMembership,
  isMissingAccountResolver,
  parseAccountSnapshot,
  resolveAccountDestination,
  type AccountDestination,
} from "@/lib/auth/account-access";
import { loadMembershipSnapshot, type MembershipSupabase } from "@/lib/auth/membership-client";

type RpcError = { code?: string; message?: string; status?: number };

type AccountRpc = MembershipSupabase & {
  auth: {
    getUser: () => PromiseLike<{
      data: { user: { id: string } | null };
      error: RpcError | null;
    }>;
  };
};

let warnedMissingResolver = false;

export async function loadBrowserAccountDestination(
  invitePath?: string | null,
): Promise<AccountDestination> {
  const supabase = createClient() as unknown as AccountRpc;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { type: "lookup_error" };

  const { data, error: rpcError } = await supabase.rpc("account_workspaces");
  if (rpcError) {
    if (!isMissingAccountResolver(rpcError)) return { type: "lookup_error" };
    if (!warnedMissingResolver) {
      warnedMissingResolver = true;
      console.warn("account_workspaces is not deployed; using membership routing");
    }
    try {
      const membership = await loadMembershipSnapshot(supabase, user.id);
      return destinationFromMembership({
        companyIds: membership.companyIds,
        companyId: membership.companyId,
        invitePath,
      });
    } catch (cause) {
      console.warn("membership fallback failed", cause);
      return { type: "lookup_error" };
    }
  }

  return resolveAccountDestination({
    snapshot: parseAccountSnapshot(data),
    invitePath,
  });
}
