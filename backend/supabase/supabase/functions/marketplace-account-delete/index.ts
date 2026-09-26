import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { UnauthenticatedError } from "@/shared/errors";
import { membershipIdsForUser } from "../_shared/infrastructure/auth/membership.ts";
import { customerAdmin, getCustomerUser } from "../_shared/marketplace/customer.ts";

/**
 * In-app account deletion (App Store 5.1.1(v)). Deleting the auth user
 * unlinks client rows (client.user_id ON DELETE SET NULL) so salons keep their
 * history, and cascades likes. Salon staff accounts are refused: deleting
 * them would cascade staff and memberships.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const user = await getCustomerUser(req);
    const admin = customerAdmin();

    const memberships = await membershipIdsForUser(user.id);
    const { count: staffCount, error: staffError } = await admin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (staffError) throw staffError;

    if (memberships.companyIds.length || memberships.locationIds.length || (staffCount ?? 0) > 0) {
      return new BadResponse("Salon accounts cannot be deleted here", 409, undefined, "SALON_ACCOUNT");
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new OkResponse({ deleted: true });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new BadResponse(err.message, 401);
    console.error(err);
    return new BadResponse("Could not delete account", 500);
  }
});
