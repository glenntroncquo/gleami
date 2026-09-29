import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { corsHeadersFor } from "../infrastructure/http/cors.ts";

export const LOCALES = ["en", "nl", "fr", "pt"] as const;
export type InviteLocale = (typeof LOCALES)[number];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function roleIsGrantable(
  callerPermissions: ReadonlySet<string>,
  rolePermissions: readonly string[],
): boolean {
  if (!callerPermissions.has("invites:manage")) return false;
  return rolePermissions.every((permission) => callerPermissions.has(permission));
}

export function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersFor(origin),
      "Content-Type": "application/json",
    },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !EMAIL.test(email)) return null;
  return email;
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length < 1 || name.length > 80) return null;
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

export function normalizeLocale(value: unknown): InviteLocale {
  return LOCALES.includes(value as InviteLocale) ? (value as InviteLocale) : "en";
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function headerSafe(value: string): string {
  return value.replace(/[\r\n<>"]/g, "").trim() || "Gleami";
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const url = new URL(`${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users`);
  url.searchParams.set("filter", email);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "50");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Auth lookup failed: ${response.status} ${detail}`);
  }
  const body = await response.json();
  const users = (Array.isArray(body) ? body : body?.users ?? []) as {
    id?: string;
    email?: string;
  }[];
  const match = users.find((user) => user.email?.toLowerCase() === email && user.id);
  return match?.id ?? null;
}

export async function readSessionUser(
  req: Request,
): Promise<{ id: string; email: string } | null> {
  const header = req.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}
