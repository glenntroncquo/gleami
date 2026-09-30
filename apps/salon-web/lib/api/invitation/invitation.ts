import { createClient } from "@/lib/supabase/client";

export type CreateInvitationInput = {
  companyId: string;
  staffId: string;
  locationId: string | null;
  locale: string;
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
};

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
