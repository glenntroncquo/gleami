import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_TOKEN_PATTERN,
  appointmentCancelUrl,
  generateAppointmentToken,
  hashAppointmentToken,
  verifyAppointmentAccessToken,
} from "../../supabase/functions/_shared/appointment/access-token.ts";

const APPOINTMENT_ID = "3f6f74f0-3f3b-4d3e-9c4b-0f2b9f2f7a11";

describe("appointment access tokens", () => {
  it("generates 256-bit base64url tokens matching the strict shape", () => {
    const token = generateAppointmentToken();
    expect(token).toMatch(APPOINTMENT_TOKEN_PATTERN);
    expect(token).toHaveLength(43);
  });

  it("never repeats a token", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateAppointmentToken()));
    expect(tokens.size).toBe(200);
  });

  it("hashes to a stable 64-char lowercase hex digest", async () => {
    const hash = await hashAppointmentToken("test");
    expect(hash).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects malformed tokens without touching the database", async () => {
    const explosiveClient = new Proxy(
      {},
      {
        get() {
          throw new Error("client must not be called for malformed tokens");
        },
      },
    );

    for (const bad of [
      "",
      "short",
      "not-a-token-at-all-not-a-token-at-all!",
      "A".repeat(42),
      "A".repeat(44),
      `${"A".repeat(42)}=`,
    ]) {
      // deno-lint-ignore no-explicit-any
      expect(await verifyAppointmentAccessToken(explosiveClient as any, APPOINTMENT_ID, bad)).toBe(
        false,
      );
    }
  });

  it("builds cancel URLs scoped to a single appointment", () => {
    const token = generateAppointmentToken();
    expect(appointmentCancelUrl(APPOINTMENT_ID, token)).toBe(
      `https://salonify.co/nl/cancel-appointment/${APPOINTMENT_ID}/${token}`,
    );
  });
});
