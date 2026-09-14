import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseClient } from "@/shared/supabase";
import { OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { registerSalonOwnerSchema } from "./schema.ts";

const supabase = createSupabaseClient();

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const isAllowed =
    !origin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : allowedOrigins[0] ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
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
    } = validation;

    const normalizedEmail = email.trim().toLowerCase();
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
