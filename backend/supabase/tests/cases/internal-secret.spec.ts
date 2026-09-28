import { describe, expect, it } from "vitest";
import {
  internalSecretMatches,
  INTERNAL_SECRET_PLACEHOLDER,
} from "../../supabase/functions/_shared/infrastructure/auth/internal-secret.ts";
import { constantTimeEquals } from "../../supabase/functions/_shared/infrastructure/crypto/constant-time.ts";

const SECRET = "s3cr3t-value-used-by-triggers-and-cron";

describe("internal webhook secret", () => {
  it("accepts the exact secret", () => {
    expect(internalSecretMatches(SECRET, SECRET)).toBe(true);
  });

  it("tolerates surrounding whitespace from header transport", () => {
    expect(internalSecretMatches(`  ${SECRET}  `, SECRET)).toBe(true);
  });

  it("rejects a wrong, truncated, or extended secret", () => {
    expect(internalSecretMatches("wrong", SECRET)).toBe(false);
    expect(internalSecretMatches(SECRET.slice(0, -1), SECRET)).toBe(false);
    expect(internalSecretMatches(`${SECRET}x`, SECRET)).toBe(false);
  });

  it("fails closed when the caller sends nothing", () => {
    expect(internalSecretMatches(null, SECRET)).toBe(false);
    expect(internalSecretMatches("", SECRET)).toBe(false);
  });

  it("fails closed when the secret is unset or still the placeholder", () => {
    // A deploy that forgot to substitute the migration placeholder, or forgot
    // to set the function secret, must not end up accepting every caller.
    expect(internalSecretMatches(SECRET, undefined)).toBe(false);
    expect(internalSecretMatches(SECRET, "")).toBe(false);
    expect(internalSecretMatches(INTERNAL_SECRET_PLACEHOLDER, INTERNAL_SECRET_PLACEHOLDER)).toBe(false);
  });

  it("does not accept a JWT-shaped bearer token", () => {
    // Placeholder shaped like the credential class this secret replaced.
    const jwtShaped = "HEADER.PAYLOAD.SIGNATURE";
    expect(internalSecretMatches(jwtShaped, SECRET)).toBe(false);
  });
});

describe("constantTimeEquals", () => {
  it("matches only identical strings", () => {
    expect(constantTimeEquals("abc", "abc")).toBe(true);
    expect(constantTimeEquals("abc", "abd")).toBe(false);
    expect(constantTimeEquals("abc", "ab")).toBe(false);
    expect(constantTimeEquals("", "")).toBe(true);
  });
});
