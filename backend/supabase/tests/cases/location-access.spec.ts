import { describe, expect, it } from "vitest";
import { assembleMembershipIds } from "../../supabase/functions/_shared/infrastructure/auth/membership-ids.ts";
import {
  requireCompanyAccess,
  requireLocationAccess,
  requireShopAccess,
} from "../../supabase/functions/_shared/infrastructure/auth/guard.ts";
import { ForbiddenError } from "../../supabase/functions/_shared/infrastructure/errors.ts";

type AuthContext = {
  userId: string;
  companyIds: string[];
  locationIds: string[];
};

const companyId = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const locationA = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";
const locationB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function stylistAtA(): AuthContext {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    companyIds: [companyId],
    locationIds: [locationA],
  };
}

function ownerAllShops(): AuthContext {
  return {
    userId: "22222222-2222-4222-8222-222222222222",
    companyIds: [companyId],
    locationIds: [locationA, locationB],
  };
}

describe("assembleMembershipIds (my_locations semantics)", () => {
  it("gives a location-only stylist that shop and its company, not sibling shops", () => {
    const ids = assembleMembershipIds({
      companyMembershipCompanyIds: [],
      locationMembershipLocationIds: [locationA],
      locationRows: [{ id: locationA, companyId }],
    });

    expect(ids.companyIds).toEqual([companyId]);
    expect(ids.locationIds).toEqual([locationA]);
    expect(ids.locationIds).not.toContain(locationB);
  });

  it("gives a company member every location of that company", () => {
    const ids = assembleMembershipIds({
      companyMembershipCompanyIds: [companyId],
      locationMembershipLocationIds: [],
      locationRows: [
        { id: locationA, companyId },
        { id: locationB, companyId },
      ],
    });

    expect(ids.companyIds).toEqual([companyId]);
    expect(ids.locationIds).toEqual(expect.arrayContaining([locationA, locationB]));
    expect(ids.locationIds).toHaveLength(2);
  });
});

describe("requireLocationAccess / requireShopAccess", () => {
  it("lets a location-A stylist act at A and forbids B", () => {
    const ctx = stylistAtA();
    expect(() => requireShopAccess(ctx, companyId, locationA)).not.toThrow();
    expect(() => requireLocationAccess(ctx, locationB)).toThrow(ForbiddenError);
    expect(() => requireShopAccess(ctx, companyId, locationB)).toThrow(ForbiddenError);
  });

  it("lets a company owner act at every shop", () => {
    const ctx = ownerAllShops();
    expect(() => requireShopAccess(ctx, companyId, locationA)).not.toThrow();
    expect(() => requireShopAccess(ctx, companyId, locationB)).not.toThrow();
  });

  it("keeps single-location (no location_id) on the company gate only", () => {
    const ctx = stylistAtA();
    expect(() => requireShopAccess(ctx, companyId, null)).not.toThrow();
    expect(() => requireShopAccess(ctx, companyId, undefined)).not.toThrow();
    expect(() => requireCompanyAccess(ctx, "99999999-9999-4999-8999-999999999999")).toThrow(
      ForbiddenError,
    );
  });
});
