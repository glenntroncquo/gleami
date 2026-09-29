import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "../../supabase/functions/_shared/infrastructure/http/cors.ts";
import { isAllowedRedirectUrl } from "../../supabase/functions/_shared/infrastructure/http/redirect.ts";

describe("isAllowedOrigin (H6)", () => {
  it("allows non-browser callers (no Origin header)", () => {
    expect(isAllowedOrigin(null)).toBe(true);
  });

  it("allows first-party salonify origins", () => {
    expect(isAllowedOrigin("https://salonify.co")).toBe(true);
    expect(isAllowedOrigin("https://app.salonify.co")).toBe(true);
    expect(isAllowedOrigin("https://booking.salonify.co")).toBe(true);
  });

  it("allows localhost for development", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173")).toBe(true);
  });

  it("rejects lookalike and foreign origins", () => {
    expect(isAllowedOrigin("https://salonify.co.evil.com")).toBe(false);
    expect(isAllowedOrigin("https://evilsalonify.co")).toBe(false);
    expect(isAllowedOrigin("http://salonify.co")).toBe(false);
    expect(isAllowedOrigin("https://example.com")).toBe(false);
    expect(isAllowedOrigin("not a url")).toBe(false);
  });
});

describe("isAllowedRedirectUrl (H4/M4)", () => {
  it("allows https URLs on salonify.co and subdomains", () => {
    expect(isAllowedRedirectUrl("https://app.salonify.co/auth/callback?locale=nl")).toBe(true);
    expect(isAllowedRedirectUrl("https://salonify.co/nl")).toBe(true);
  });

  it("allows localhost over http for development", () => {
    expect(isAllowedRedirectUrl("http://localhost:3000/auth/callback")).toBe(true);
  });

  it("rejects foreign hosts, lookalikes, and non-https", () => {
    expect(isAllowedRedirectUrl("https://evil.com/auth/callback")).toBe(false);
    expect(isAllowedRedirectUrl("https://salonify.co.evil.com")).toBe(false);
    expect(isAllowedRedirectUrl("http://app.salonify.co/auth/callback")).toBe(false);
    expect(isAllowedRedirectUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUrl("not-a-url")).toBe(false);
  });
});
