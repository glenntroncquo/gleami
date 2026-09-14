import { describe, expect, it } from "vitest";
import {
  appointmentMatchesCancelKeys,
  assertStaffCancelAccess,
} from "../../supabase/functions/_shared/appointment/commands/cancel/access.ts";
import { ForbiddenError } from "../../supabase/functions/_shared/infrastructure/errors.ts";

const companyId = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const clientId = "c1111111-1111-4111-8111-111111111111";
const locationA = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";
const locationB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const appointmentAtA = {
  clientId,
  companyId,
  locationId: locationA,
};

describe("appointmentMatchesCancelKeys", () => {
  it("matches the public capability triple", () => {
    expect(
      appointmentMatchesCancelKeys(appointmentAtA, { clientId, companyId }),
    ).toBe(true);
  });

  it("rejects a selected-shop mismatch against appointment.location_id", () => {
    expect(
      appointmentMatchesCancelKeys(appointmentAtA, {
        clientId,
        companyId,
        locationId: locationB,
      }),
    ).toBe(false);
  });

  it("accepts a selected shop that matches appointment.location_id", () => {
    expect(
      appointmentMatchesCancelKeys(appointmentAtA, {
        clientId,
        companyId,
        locationId: locationA,
      }),
    ).toBe(true);
  });
});

describe("assertStaffCancelAccess", () => {
  it("does not require membership on the public (no JWT) path", () => {
    expect(() => assertStaffCancelAccess(null, appointmentAtA)).not.toThrow();
  });

  it("lets a location-A stylist cancel at A and forbids B", () => {
    const stylistAtA = {
      userId: "11111111-1111-4111-8111-111111111111",
      companyIds: [companyId],
      locationIds: [locationA],
    };
    expect(() => assertStaffCancelAccess(stylistAtA, appointmentAtA)).not.toThrow();
    expect(() =>
      assertStaffCancelAccess(stylistAtA, { companyId, locationId: locationB }),
    ).toThrow(ForbiddenError);
  });

  it("lets a company owner cancel at every shop", () => {
    const owner = {
      userId: "22222222-2222-4222-8222-222222222222",
      companyIds: [companyId],
      locationIds: [locationA, locationB],
    };
    expect(() => assertStaffCancelAccess(owner, appointmentAtA)).not.toThrow();
    expect(() =>
      assertStaffCancelAccess(owner, { companyId, locationId: locationB }),
    ).not.toThrow();
  });
});
