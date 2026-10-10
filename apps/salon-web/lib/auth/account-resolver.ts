import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COMPANY_COOKIE,
  gateAccountPath,
  isAnonymousRoute,
  isMissingAccountResolver,
  parseAccountSnapshot,
  readCompanyCookieValue,
  resolveAccountDestination,
  routeWithoutLocale,
  type AccountDestination,
  type AccountSnapshot,
} from "@/lib/auth/account-access";

type RpcError = { code?: string; message?: string; name?: string; status?: number };

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: RpcError | null }>;
  auth: {
    getUser: () => PromiseLike<{
      data: { user: { id: string } | null };
      error: RpcError | null;
    }>;
  };
};

function sessionMissing(error: RpcError | null): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.name === "AuthSessionMissingError" ||
    error.status === 401 ||
    message.includes("session") ||
    message.includes("not authenticated") ||
    message.includes("jwt")
  );
}

export async function loadAccountSnapshot(existing?: RpcClient): Promise<AccountSnapshot> {
  const supabase = existing ?? ((await createClient()) as unknown as RpcClient);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return sessionMissing(error)
      ? { ok: false, reason: "unauthenticated" }
      : { ok: false, reason: "lookup_error" };
  }
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data, error: rpcError } = await supabase.rpc("account_workspaces");
  if (rpcError) {
    if (isMissingAccountResolver(rpcError)) return { ok: false, reason: "resolver_unavailable" };
    return { ok: false, reason: "lookup_error" };
  }
  return parseAccountSnapshot(data);
}

export async function selectedCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  return readCompanyCookieValue(cookieStore.get(COMPANY_COOKIE)?.value);
}

export async function destinationForSnapshot(
  snapshot: AccountSnapshot,
  invitePath?: string | null,
): Promise<AccountDestination> {
  return resolveAccountDestination({
    snapshot,
    selectedCompanyId: await selectedCompanyId(),
    invitePath,
  });
}

export async function resolveRequestDestination(
  invitePath?: string | null,
): Promise<AccountDestination> {
  return destinationForSnapshot(await loadAccountSnapshot(), invitePath);
}

export async function enforceAccountGate(pathname: string, locale: string): Promise<void> {
  if (!pathname) return;
  if (isAnonymousRoute(routeWithoutLocale(pathname))) return;
  const destination = await resolveRequestDestination();
  const decision = gateAccountPath({ pathname, locale, destination });
  if (decision.redirect) redirect(decision.redirect);
}

export async function requestPathname(): Promise<string> {
  const headerStore = await headers();
  return headerStore.get("x-pathname") ?? "";
}
