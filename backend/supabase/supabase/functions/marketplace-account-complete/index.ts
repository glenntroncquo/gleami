import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { UnauthenticatedError } from "@/shared/errors";
import { customerAdmin, getCustomerUser, normalizeEmail } from "../_shared/marketplace/customer.ts";
import { marketplaceAccountCompleteSchema } from "./schema.ts";

/**
 * Finishes a marketplace sign-up (email code, Apple or Google): stores the
 * profile on the auth user, sets the first password for email sign-ups, and
 * links every existing client with the same verified email (or creates one)
 * so past appointments show up in the app.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  try {
    const user = await getCustomerUser(req);
    const validated = validateInput(marketplaceAccountCompleteSchema, await req.json());
    if (validated instanceof BadResponse) return validated;

    if (!user.email) return new BadResponse("Account has no email", 400, undefined, "EMAIL_REQUIRED");
    if (!user.email_confirmed_at) {
      return new BadResponse("Email is not confirmed", 403, undefined, "EMAIL_NOT_CONFIRMED");
    }

    const admin = customerAdmin();
    const email = normalizeEmail(user.email);

    if (validated.password) {
      const { data: status, error: statusError } = await admin
        .rpc("marketplace_auth_email_status", { p_email: email })
        .single<{ account_exists: boolean; has_password: boolean }>();
      if (statusError) throw statusError;
      if (status?.has_password) {
        return new BadResponse("Password already set", 409, undefined, "PASSWORD_ALREADY_SET");
      }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      ...(validated.password ? { password: validated.password } : {}),
      user_metadata: {
        ...user.user_metadata,
        first_name: validated.firstName,
        last_name: validated.lastName,
        full_name: `${validated.firstName} ${validated.lastName}`,
        phone: validated.phone,
      },
      app_metadata: {
        ...user.app_metadata,
        marketplace_profile_completed_at: new Date().toISOString(),
      },
    });
    if (updateError) {
      if (/weak|pwned|password/i.test(updateError.message)) {
        return new BadResponse("Password rejected", 422, updateError.message, "WEAK_PASSWORD");
      }
      throw updateError;
    }

    const { data: linked, error: linkError } = await admin
      .rpc("marketplace_link_customer", {
        p_user_id: user.id,
        p_email: email,
        p_first_name: validated.firstName,
        p_last_name: validated.lastName,
        p_phone: validated.phone,
      })
      .single<{ client_count: number; appointment_count: number }>();
    if (linkError) throw linkError;

    return new OkResponse({
      clientCount: linked?.client_count ?? 0,
      appointmentCount: linked?.appointment_count ?? 0,
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new BadResponse(err.message, 401);
    console.error(err);
    return new BadResponse("Could not complete account", 500);
  }
});
