import type { AuthContext } from "./context.ts";
import { ForbiddenError } from "../errors.ts";

/**
 * Throws unless the authenticated caller has a membership on `companyId`
 * (company_membership or an active location_membership at a location of that
 * company). Callers must scope every company-owned read/write through this —
 * never trust a client-supplied company_id on its own.
 */
export function requireCompanyAccess(context: AuthContext, companyId: string): void {
  if (!context.companyIds.includes(companyId)) {
    throw new ForbiddenError(`Not authorized for company ${companyId}`);
  }
}

/**
 * Throws unless the caller may act at `locationId`: active location_membership
 * on that shop, or company_membership on the shop's company (owner/admin sees
 * every shop). Matches `public.my_locations`.
 */
export function requireLocationAccess(context: AuthContext, locationId: string): void {
  if (!context.locationIds.includes(locationId)) {
    throw new ForbiddenError(`Not authorized for location ${locationId}`);
  }
}

/**
 * Company gate, plus location gate when a shop id is known.
 * Single-location tenants that omit location_id stay company-scoped.
 */
export function requireShopAccess(
  context: AuthContext,
  companyId: string,
  locationId?: string | null,
): void {
  requireCompanyAccess(context, companyId);
  if (locationId) {
    requireLocationAccess(context, locationId);
  }
}
