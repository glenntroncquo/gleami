import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { rejectDisallowedOrigin } from "../_shared/infrastructure/http/cors.ts";
import { sendEmail } from "../_shared/infrastructure/email/resend.ts";
import {
  adminClient,
  escapeHtml,
  headerSafe,
  isUuid,
  jsonResponse,
  normalizeEmail,
  normalizeLocale,
  normalizeName,
  randomToken,
  readSessionUser,
  roleIsGrantable,
  sha256Hex,
} from "../_shared/invitation/edge-support.ts";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RoleRow = {
  id: string;
  name: string;
  scope: "company" | "location";
  is_system: boolean;
  company_id: string | null;
};

async function permissionKeys(
  admin: ReturnType<typeof adminClient>,
  roleIds: string[],
): Promise<Set<string>> {
  if (roleIds.length === 0) return new Set();
  const { data, error } = await admin
    .from("role_permission")
    .select("permission_key")
    .in("role_id", roleIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.permission_key as string));
}

async function callerPermissions(input: {
  admin: ReturnType<typeof adminClient>;
  userId: string;
  companyId: string;
  locationId: string | null;
}): Promise<Set<string>> {
  if (!input.locationId) {
    const { data, error } = await input.admin
      .from("company_membership")
      .select("role_id")
      .eq("user_id", input.userId)
      .eq("company_id", input.companyId)
      .maybeSingle();
    if (error) throw error;
    return permissionKeys(input.admin, data?.role_id ? [data.role_id] : []);
  }

  const [{ data: locationMembership, error: locationError }, { data: companyMembership, error: companyError }] =
    await Promise.all([
      input.admin
        .from("location_membership")
        .select("role_id")
        .eq("user_id", input.userId)
        .eq("location_id", input.locationId)
        .eq("is_active", true)
        .maybeSingle(),
      input.admin
        .from("company_membership")
        .select("role_id")
        .eq("user_id", input.userId)
        .eq("company_id", input.companyId)
        .maybeSingle(),
    ]);
  if (locationError) throw locationError;
  if (companyError) throw companyError;
  const roleIds = [locationMembership?.role_id, companyMembership?.role_id].filter(
    (id): id is string => typeof id === "string",
  );
  return permissionKeys(input.admin, roleIds);
}

function salonOrigin(req: Request): string | null {
  const configured = Deno.env.get("SALON_WEB_URL")?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const origin = req.headers.get("Origin");
  if (!origin || rejectDisallowedOrigin(req)) return null;
  return origin.replace(/\/$/, "");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonResponse({}, 204, origin).headers });
  }
  const rejected = rejectDisallowedOrigin(req);
  if (rejected) return rejected;
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "invitation_invalid" }, 405, origin);
  }

  try {
    const session = await readSessionUser(req);
    if (!session) {
      return jsonResponse({ success: false, error: "invitation_forbidden" }, 401, origin);
    }

    const body = await req.json().catch(() => null);
    const companyId = body?.companyId;
    const roleId = body?.roleId;
    const locationId = body?.locationId ?? null;
    const email = normalizeEmail(body?.email);
    const firstName = normalizeName(body?.firstName);
    const lastName = normalizeName(body?.lastName);
    const locale = normalizeLocale(body?.locale);

    if (body?.email != null && !email) {
      return jsonResponse({ success: false, error: "invitation_invalid_email" }, 400, origin);
    }
    if (!isUuid(companyId) || !isUuid(roleId) || !email || !firstName || !lastName) {
      return jsonResponse({ success: false, error: "invitation_invalid" }, 400, origin);
    }
    if (locationId != null && !isUuid(locationId)) {
      return jsonResponse({ success: false, error: "invitation_invalid" }, 400, origin);
    }

    const admin = adminClient();
    const { data: company, error: companyError } = await admin
      .from("company")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) {
      return jsonResponse({ success: false, error: "invitation_forbidden" }, 403, origin);
    }

    const { data: role, error: roleError } = await admin
      .from("role")
      .select("id, name, scope, is_system, company_id")
      .eq("id", roleId)
      .maybeSingle();
    if (roleError) throw roleError;
    const roleRow = role as RoleRow | null;
    if (!roleRow || (roleRow.scope !== "company" && roleRow.scope !== "location")) {
      return jsonResponse({ success: false, error: "invitation_forbidden" }, 403, origin);
    }
    if (!roleRow.is_system && roleRow.company_id !== companyId) {
      return jsonResponse({ success: false, error: "invitation_forbidden" }, 403, origin);
    }
    if (roleRow.scope === "company" && locationId) {
      return jsonResponse({ success: false, error: "invitation_role_scope" }, 400, origin);
    }
    if (roleRow.scope === "location" && !locationId) {
      return jsonResponse({ success: false, error: "invitation_role_scope" }, 400, origin);
    }

    let locationName: string | null = null;
    if (locationId) {
      const { data: location, error: locationError } = await admin
        .from("location")
        .select("id, company_id, name")
        .eq("id", locationId)
        .maybeSingle();
      if (locationError) throw locationError;
      if (!location || location.company_id !== companyId) {
        return jsonResponse({ success: false, error: "invitation_forbidden" }, 403, origin);
      }
      locationName = location.name;
    }

    const callerPerms = await callerPermissions({
      admin,
      userId: session.id,
      companyId,
      locationId,
    });
    const rolePerms = await permissionKeys(admin, [roleId]);
    if (!roleIsGrantable(callerPerms, [...rolePerms])) {
      return jsonResponse({ success: false, error: "invitation_not_grantable" }, 403, origin);
    }

    let pending = admin
      .from("invitation")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .ilike("email", email);
    pending = locationId ? pending.eq("location_id", locationId) : pending.is("location_id", null);
    const { data: existing, error: existingError } = await pending.maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return jsonResponse({ success: false, error: "invitation_duplicate" }, 409, origin);
    }

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const { data: created, error: insertError } = await admin
      .from("invitation")
      .insert({
        company_id: companyId,
        email,
        first_name: firstName,
        last_name: lastName,
        role_id: roleId,
        location_id: locationId,
        invited_by: session.id,
        status: "pending",
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ success: false, error: "invitation_duplicate" }, 409, origin);
      }
      throw insertError;
    }

    const base = salonOrigin(req);
    const path = `/${locale}/invite?token=${encodeURIComponent(token)}`;
    const inviteUrl = base ? `${base}${path}` : null;
    let emailSent = false;

    if (inviteUrl && Deno.env.get("RESEND_API_KEY")) {
      const safeCompany = escapeHtml(company.name ?? "Gleami");
      const safeName = escapeHtml(`${firstName} ${lastName}`);
      const safeRole = escapeHtml(roleRow.name);
      const safeLocation = locationName ? escapeHtml(locationName) : "";
      const where = locationName
        ? `${safeCompany} (${safeLocation})`
        : safeCompany;
      try {
        await sendEmail({
          from: `${headerSafe(company.name ?? "Gleami")} <afspraken@notifications.salonify.co>`,
          to: [email],
          subject: `You're invited to ${headerSafe(company.name ?? "Gleami")}`,
          text: [
            `Hi ${firstName},`,
            "",
            `You've been invited to ${company.name ?? "the salon"} as ${roleRow.name}.`,
            locationName ? `Location: ${locationName}` : "Access: whole company",
            "",
            `Create your login: ${inviteUrl}`,
            "",
            "This link expires in 7 days.",
          ].join("\n"),
          html: `<p>Hi ${safeName},</p><p>You've been invited to ${where} as <strong>${safeRole}</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Create your login</a></p><p>This link expires in 7 days.</p>`,
        });
        emailSent = true;
        await admin
          .from("invitation")
          .update({ email_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", created.id);
      } catch (emailError) {
        console.error("Invite email failed", emailError);
      }
    }

    return jsonResponse(
      {
        success: true,
        invitationId: created.id,
        token,
        path,
        emailSent,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("invitation-create failed", error);
    return jsonResponse({ success: false, error: "invitation_invalid" }, 500, origin);
  }
});
