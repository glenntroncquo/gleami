import { createClient } from "@/lib/supabase/server";

const AUTHORIZATION_ID = /^[A-Za-z0-9_-]{8,200}$/;

export type OAuthConsentDetails = {
  authorizationId: string;
  clientName: string;
  redirectUri: string;
  scopes: string[];
  alreadyApprovedRedirect: string | null;
};

export function isAuthorizationId(value: string | null | undefined): value is string {
  return typeof value === "string" && AUTHORIZATION_ID.test(value);
}

export function scopeLabel(scope: string): string {
  switch (scope) {
    case "openid":
      return "Sign in as you";
    case "email":
      return "See your email address";
    case "profile":
      return "See your name";
    case "phone":
      return "See your phone number";
    case "offline_access":
      return "Stay connected after the first hour";
    default:
      return scope;
  }
}

export function safeExternalRedirect(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

type AuthorizationPayload = {
  authorization_id?: string;
  redirect_uri?: string;
  redirect_url?: string;
  scope?: string;
  client?: { name?: string };
};

async function accessTokenForConsent(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Sign in required");
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Sign in required");
  }
  return session.access_token;
}

export async function readOAuthConsent(authorizationId: string): Promise<OAuthConsentDetails> {
  const accessToken = await accessTokenForConsent();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => null)) as AuthorizationPayload | { msg?: string } | null;
  if (!response.ok || !payload) {
    const message = payload && "msg" in payload && payload.msg ? payload.msg : "This approval request is no longer valid.";
    throw new Error(message);
  }

  const details = payload as AuthorizationPayload;
  if (!details.authorization_id && details.redirect_url) {
    return {
      authorizationId,
      clientName: "",
      redirectUri: "",
      scopes: [],
      alreadyApprovedRedirect: safeExternalRedirect(details.redirect_url),
    };
  }

  return {
    authorizationId,
    clientName: details.client?.name?.trim() || "An app",
    redirectUri: details.redirect_uri ?? "",
    scopes: (details.scope ?? "").split(" ").map((scope) => scope.trim()).filter(Boolean),
    alreadyApprovedRedirect: null,
  };
}

export async function decideOAuthConsent(
  authorizationId: string,
  decision: "approve" | "deny",
): Promise<string> {
  const accessToken = await accessTokenForConsent();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/oauth/authorizations/${encodeURIComponent(authorizationId)}/consent`,
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: decision }),
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => null)) as { redirect_url?: string; msg?: string } | null;
  const redirectUrl = safeExternalRedirect(payload?.redirect_url);
  if (!response.ok || !redirectUrl) {
    throw new Error(payload?.msg || "Could not finish this approval.");
  }
  return redirectUrl;
}
