import type { InviteRoleOption, InviteScope } from "@/lib/auth/invite-roles";
import { asLocationClient } from "@/lib/location";
import { createClient } from "@/lib/supabase/client";

export type CreateInvitationInput = {
  companyId: string;
  staffId: string;
  locationId: string | null;
  locale: string;
  roleId?: string;
  scope?: InviteScope;
};

export type CreateInvitationResult = {
  success: boolean;
  error?: string;
  invitationId?: string;
  token?: string;
  path?: string;
  emailSent?: boolean;
};

async function functionHeaders(sessionToken?: string | null): Promise<HeadersInit> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Supabase environment variables are not configured");
  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

function functionsUrl(name: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase environment variables are not configured");
  return `${supabaseUrl}/functions/v1/${name}`;
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, error: "invitation_forbidden" };

  const response = await fetch(functionsUrl("invitation-create"), {
    method: "POST",
    headers: await functionHeaders(token),
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as CreateInvitationResult | null;
  if (!body) return { success: false, error: "invitation_invalid" };
  return body;
}

export type PendingInvitationResult = {
  success: boolean;
  pending?: boolean;
  expiresAt?: string | null;
  error?: string;
};

export async function lookupPendingInvitation(input: {
  companyId: string;
  staffId: string;
  locationId: string | null;
  scope?: InviteScope;
}): Promise<PendingInvitationResult> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { success: false, error: "invitation_forbidden" };

  const response = await fetch(functionsUrl("invitation-create"), {
    method: "POST",
    headers: await functionHeaders(token),
    body: JSON.stringify({ ...input, action: "pending" }),
  });
  const body = (await response.json().catch(() => null)) as PendingInvitationResult | null;
  if (!body?.success) return { success: false, pending: false, error: body?.error };
  return { success: true, pending: Boolean(body.pending), expiresAt: body.expiresAt ?? null };
}

export type InvitationPreview = {
  success: boolean;
  error?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string;
  locationName?: string | null;
  roleName?: string;
  roleScope?: "company" | "location";
  accountExists?: boolean;
};

type RoleCatalogRow = {
  id: string;
  name: string;
  scope: string;
  is_system: boolean;
  company_id: string | null;
};

async function rows<T>(
  query: PromiseLike<{ data: unknown; error: { message?: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message ?? "role lookup failed");
  return (Array.isArray(data) ? data : []) as T[];
}

export async function loadInviteRoleOptions(companyId: string): Promise<InviteRoleOption[]> {
  const supabase = asLocationClient();
  const [systemRoles, companyRoles] = await Promise.all([
    rows<RoleCatalogRow>(
      supabase.from("role").select("id, name, scope, is_system, company_id").eq("is_system", true),
    ),
    rows<RoleCatalogRow>(
      supabase
        .from("role")
        .select("id, name, scope, is_system, company_id")
        .eq("company_id", companyId),
    ),
  ]);
  const roles = [...systemRoles, ...companyRoles].filter(
    (role): role is RoleCatalogRow & { scope: InviteScope } =>
      role.scope === "company" || role.scope === "location",
  );
  const ids = [...new Set(roles.map((role) => role.id))];
  const permissionRows = ids.length
    ? await rows<{ role_id: string; permission_key: string }>(
        supabase.from("role_permission").select("role_id, permission_key").in("role_id", ids),
      )
    : [];
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    scope: role.scope,
    permissions: permissionRows
      .filter((row) => row.role_id === role.id)
      .map((row) => row.permission_key),
  }));
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const response = await fetch(functionsUrl("invitation-accept"), {
    method: "POST",
    headers: await functionHeaders(),
    body: JSON.stringify({ action: "preview", token }),
  });
  const body = (await response.json().catch(() => null)) as InvitationPreview | null;
  if (!body) return { success: false, error: "invalid" };
  return body;
}

export async function acceptInvitation(input: {
  token: string;
  password?: string;
}): Promise<{ success: boolean; error?: string; email?: string }> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch(functionsUrl("invitation-accept"), {
    method: "POST",
    headers: await functionHeaders(sessionData.session?.access_token),
    body: JSON.stringify({
      action: "accept",
      token: input.token,
      password: input.password,
    }),
  });
  const body = (await response.json().catch(() => null)) as {
    success?: boolean;
    error?: string;
    email?: string;
  } | null;
  if (!body) return { success: false, error: "invalid" };
  return { success: Boolean(body.success), error: body.error, email: body.email };
}
