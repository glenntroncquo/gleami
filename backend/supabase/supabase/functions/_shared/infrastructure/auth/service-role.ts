import { UnauthenticatedError, ForbiddenError } from "../errors.ts";

function extractBearerToken(req: Request): string {
  const header = req.headers.get("Authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw new UnauthenticatedError("Missing Authorization header");
  }

  return token;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new UnauthenticatedError("Malformed token");
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new UnauthenticatedError("Malformed token");
  }
}

/**
 * Restricts a function to callers presenting the project's service_role JWT -
 * i.e. our own DB triggers/cron jobs, never staff, customers, or the public
 * anon key. Relies on the platform gateway (verify_jwt) having already
 * validated the token's signature before this code runs.
 */
export function requireServiceRole(req: Request): void {
  const token = extractBearerToken(req);
  const payload = decodeJwtPayload(token);

  if (payload.role !== "service_role") {
    throw new ForbiddenError("This function can only be called by trusted internal services");
  }
}
