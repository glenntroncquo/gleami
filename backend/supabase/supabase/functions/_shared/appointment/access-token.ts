import { RepositoryError } from "../infrastructure/errors.ts";
import type { TypedSupabaseClient } from "../infrastructure/supabase/client.ts";

/**
 * Appointment manage-booking tokens.
 *
 * Guest-facing cancel/manage links carry one of these tokens instead of the
 * old appointmentId + clientId + companyId triple. A token is minted fresh
 * per notification email, scoped to exactly one appointment, and only its
 * SHA-256 hash is stored — a database read does not yield usable links, and
 * tokens are unguessable (256 bits) rather than enumerable UUIDs. Tokens
 * expire at appointment start + 1 day and can be revoked by deleting the row.
 *
 * The client is passed in so this module stays free of env-bound singletons
 * and unit-testable.
 */

const TOKEN_BYTES = 32;

/** base64url of 32 random bytes: exactly 43 characters, no padding. */
export const APPOINTMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateAppointmentToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

export async function hashAppointmentToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toHex(digest);
}

/**
 * Mints a token for one appointment and stores only its hash.
 * The token expires at appointment start + 1 day: cancellation requires
 * start > now anyway, and the grace day lets a guest still view details
 * shortly after the visit. Deleting the row revokes a token instantly.
 */
export async function issueAppointmentAccessToken(
  client: TypedSupabaseClient,
  appointmentId: string,
): Promise<string> {
  const token = generateAppointmentToken();
  const tokenHash = await hashAppointmentToken(token);

  const { data: appointment, error: appointmentError } = await client
    .from("appointment")
    .select("start")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    throw new RepositoryError("Failed to load appointment for access token", {
      cause: appointmentError,
    });
  }

  const expiresAt = new Date(new Date(appointment.start).getTime() + 24 * 60 * 60 * 1000);

  const { error } = await client
    .from("appointment_access_token")
    .insert({
      appointment_id: appointmentId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    throw new RepositoryError("Failed to issue appointment access token", { cause: error });
  }

  return token;
}

/** Constant-shape check: malformed tokens never hit the database. */
export async function verifyAppointmentAccessToken(
  client: TypedSupabaseClient,
  appointmentId: string,
  token: string,
): Promise<boolean> {
  if (!APPOINTMENT_TOKEN_PATTERN.test(token)) return false;

  const tokenHash = await hashAppointmentToken(token);
  const { data, error } = await client
    .from("appointment_access_token")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new RepositoryError("Failed to verify appointment access token", { cause: error });
  }

  return data !== null;
}

export function appointmentCancelUrl(appointmentId: string, token: string): string {
  return `https://salonify.co/nl/cancel-appointment/${appointmentId}/${token}`;
}
