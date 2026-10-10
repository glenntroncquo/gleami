import { createClient } from "@/lib/supabase/client";
import {
  parseAccountSnapshot,
  resolveAccountDestination,
  type AccountDestination,
} from "@/lib/auth/account-access";

type AccountRpc = {
  rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  auth: {
    getUser: () => PromiseLike<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
};

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
  if (rpcError) return { type: "lookup_error" };

  return resolveAccountDestination({
    snapshot: parseAccountSnapshot(data),
    invitePath,
  });
}
