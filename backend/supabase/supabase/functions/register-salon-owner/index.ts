import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "@/shared/supabase";
import { OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { corsHeadersFor, rejectDisallowedOrigin } from "@/shared/cors";
import { isAllowedRedirectUrl } from "@/shared/redirect";
import { registerSalonOwnerSchema } from "./schema.ts";

const supabase = createSupabaseClient();

const getCorsHeaders = corsHeadersFor;

/**
 * H4 abuse control. Registration creates a company + auth user + sends email;
 * without throttling it is a free resource-exhaustion and spam vector. The
 * shared state is the database (edge isolates are ephemeral): max signups per
 * email per hour and a global per-hour ceiling.
 */
const SIGNUP_WINDOW_MINUTES = 60;
const SIGNUP_MAX_PER_EMAIL = 3;
const SIGNUP_MAX_GLOBAL = 50;

async function signupRateLimitExceeded(normalizedEmail: string): Promise<boolean> {
  const since = new Date(Date.now() - SIGNUP_WINDOW_MINUTES * 60 * 1000).toISOString();
  const [perEmail, global] = await Promise.all([
    supabase
      .from("company")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("created_at", since),
    supabase
      .from("company")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
  ]);
  return (perEmail.count ?? 0) >= SIGNUP_MAX_PER_EMAIL || (global.count ?? 0) >= SIGNUP_MAX_GLOBAL;
}

/**
 * Optional CAPTCHA (Cloudflare Turnstile). When TURNSTILE_SECRET_KEY is set,
 * requests must carry a valid captchaToken; when unset, registration relies on
 * the rate limit above. Configure the secret and the frontend widget together.
 */
async function captchaAccepted(token: string | undefined, remoteIp: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token) return false;

  const form = new URLSearchParams({ secret, response: token });
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

async function deleteCompany(companyId: string) {
  await supabase.from("company").delete().eq("id", companyId);
}

async function deleteAuthUser(userId: string) {
  await supabase.auth.admin.deleteUser(userId);
}

async function rollbackSignup(opts: {
  companyId: string;
  userId?: string | null;
  staffId?: string | null;
}) {
  if (opts.staffId) {
    await supabase.from("staff").delete().eq("id", opts.staffId);
  }
  if (opts.userId) {
    await deleteAuthUser(opts.userId);
  }
  await deleteCompany(opts.companyId);
}

async function requireOwnerRoleId(): Promise<string> {
  const { data, error } = await supabase
    .from("role")
    .select("id")
    .eq("name", "owner")
    .eq("is_system", true)
    .eq("scope", "company")
    .single();

  if (error || !data) {
    throw new Error(`owner system role missing: ${error?.message ?? "not found"}`);
  }

  return data.id;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  const rejected = rejectDisallowedOrigin(req);
  if (rejected) {
    return rejected;
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405, origin);
  }

  try {
    const body = await req.json();
    const validation = validateInput(registerSalonOwnerSchema, body);

    if (validation instanceof BadResponse) {
      return validation;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      locale,
      company,
      emailRedirectTo,
      captchaToken,
    } = validation;

    const normalizedEmail = email.trim().toLowerCase();

    // H4: the confirmation email's redirect target must stay on our own
    // origins — otherwise our signup email becomes a phishing delivery.
    if (!isAllowedRedirectUrl(emailRedirectTo)) {
      return jsonResponse(
        { success: false, error: "Invalid redirect URL" },
        400,
        origin
      );
    }

    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await captchaAccepted(captchaToken, remoteIp))) {
      return jsonResponse(
        { success: false, error: "Captcha verification failed" },
        400,
        origin
      );
    }

    if (await signupRateLimitExceeded(normalizedEmail)) {
      return jsonResponse(
        { success: false, error: "Too many signups, please try again later" },
        429,
        origin
      );
    }
    const companyEmail = (company.email ?? normalizedEmail).trim().toLowerCase();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { data: createdCompany, error: companyError } = await supabase
      .from("company")
      .insert({
        name: company.name.trim(),
        email: companyEmail,
        street: company.street?.trim() || null,
        city: company.city?.trim() || null,
        postal_code: company.postalCode?.trim() || null,
        state: company.state?.trim() || null,
        country: company.country?.trim() || null,
        has_filled_details: true,
      })
      .select("id")
      .single();

    if (companyError || !createdCompany) {
      console.error("Failed to create company:", companyError);
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        500,
        origin
      );
    }

    const companyId = createdCompany.id;
    let userId: string | null = null;

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: false,
        app_metadata: {
          account_type: "salon_owner",
        },
        user_metadata: {
          full_name: fullName,
          locale,
        },
      });

    if (authError || !authData.user) {
      console.error("Failed to create auth user:", authError);
      await deleteCompany(companyId);
      const isDuplicate =
        authError?.message?.toLowerCase().includes("already") ||
        authError?.status === 422;
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        isDuplicate ? 400 : 500,
        origin
      );
    }

    userId = authData.user.id;

    const { data: createdStaff, error: staffError } = await supabase
      .from("staff")
      .insert({
        company_id: companyId,
        user_id: userId,
        email: normalizedEmail,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
        status: "Active",
      })
      .select("id")
      .single();

    if (staffError || !createdStaff) {
      console.error("Failed to create staff:", staffError);
      await rollbackSignup({ companyId, userId });
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        500,
        origin
      );
    }

    // Phase 5: roles live on company_membership. Do not write staff.role or
    // staff_company. Do not stamp app_metadata.company_ids.
    let ownerRoleId: string;
    try {
      ownerRoleId = await requireOwnerRoleId();
    } catch (roleLookupError) {
      console.error("Failed to load owner system role:", roleLookupError);
      await rollbackSignup({ companyId, userId, staffId: createdStaff.id });
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        500,
        origin
      );
    }

    const { error: locationError } = await supabase.from("location").insert({
      company_id: companyId,
      name: company.name.trim(),
      country: company.country?.trim() || null,
      state: company.state?.trim() || null,
      city: company.city?.trim() || null,
      postal_code: company.postalCode?.trim() || null,
      street: company.street?.trim() || null,
      email: companyEmail,
      timezone: "Europe/Brussels",
      is_primary: true,
      is_listed: false,
      is_active: true,
    });

    if (locationError) {
      console.error("Failed to create primary location:", locationError);
      await rollbackSignup({ companyId, userId, staffId: createdStaff.id });
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        500,
        origin
      );
    }

    const { error: membershipError } = await supabase
      .from("company_membership")
      .insert({
        user_id: userId,
        company_id: companyId,
        role_id: ownerRoleId,
      });

    if (membershipError) {
      console.error("Failed to create owner membership:", membershipError);
      await rollbackSignup({ companyId, userId, staffId: createdStaff.id });
      return jsonResponse(
        { success: false, error: "Unable to create account" },
        500,
        origin
      );
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo,
      },
    });

    if (resendError) {
      console.error("Failed to send confirmation email:", resendError);
    }

    return new OkResponse({ success: true });
  } catch (err) {
    console.error("register-salon-owner error:", err);
    return jsonResponse(
      { success: false, error: "Unable to create account" },
      500,
      origin
    );
  }
});
