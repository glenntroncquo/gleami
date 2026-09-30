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

type StaffRow = {
  id: string;
  company_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
};

type InviteTarget = {
  locationId: string;
  locationName: string;
  roleId: string;
};

function missingColumn(
  error: { code?: string; message?: string } | null,
  column: string,
): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  const name = column.toLowerCase();
  return error.code === "42703" ||
    error.code === "PGRST204" ||
    (message.includes(name) &&
      (message.includes("does not exist") || message.includes("schema cache")));
}

function inviteFirstName(staff: StaffRow, email: string): string {
  const fromProfile = normalizeName(staff.first_name);
  if (fromProfile) return fromProfile;
  const local = email.split("@")[0]?.replace(/[._+-]+/g, " ").trim() ?? "";
  return normalizeName(local) ?? "Team";
}

async function defaultLocationStaffRoleId(
  admin: ReturnType<typeof adminClient>,
): Promise<string | null> {
  const { data, error } = await admin
    .from("role")
    .select("id, name")
    .eq("scope", "location")
    .eq("is_system", true);
  if (error) throw error;
  const roles = data ?? [];
  for (const name of ["stylist", "staff"]) {
    const match = roles.find((role) => role.name === name);
    if (match?.id) return match.id as string;
  }
  return (roles[0]?.id as string | undefined) ?? null;
}

async function resolveExistingStaffTarget(
  admin: ReturnType<typeof adminClient>,
  input: { companyId: string; staffId: string; locationId: string | null },
): Promise<
  | { ok: true; target: InviteTarget }
  | { ok: false; error: "invitation_forbidden" | "invitation_no_location" | "invitation_invalid" }
> {
  const { data: locations, error: locationError } = await admin
    .from("location")
    .select("id, name")
    .eq("company_id", input.companyId);
  if (locationError) throw locationError;
  const locationById = new Map(
    (locations ?? []).map((row) => [row.id as string, (row.name as string | null) ?? ""]),
  );
  if (input.locationId && !locationById.has(input.locationId)) {
    return { ok: false, error: "invitation_forbidden" };
  }

  const { data: memberships, error: membershipError } = await admin
    .from("location_membership")
    .select("location_id, role_id, is_active")
    .eq("staff_id", input.staffId);
  if (membershipError) throw membershipError;
  const rows = (memberships ?? []).filter((row) => locationById.has(row.location_id as string));
  const pool = input.locationId
    ? rows.filter((row) => row.location_id === input.locationId)
    : rows;
  const chosen = pool.find((row) => row.is_active) ?? pool[0] ?? null;
  if (chosen) {
    const locationId = chosen.location_id as string;
    return {
      ok: true,
      target: {
        locationId,
        locationName: locationById.get(locationId) ?? "",
        roleId: chosen.role_id as string,
      },
    };
  }

  if (!input.locationId) return { ok: false, error: "invitation_no_location" };
  const roleId = await defaultLocationStaffRoleId(admin);
  if (!roleId) return { ok: false, error: "invitation_invalid" };
  return {
    ok: true,
    target: {
      locationId: input.locationId,
      locationName: locationById.get(input.locationId) ?? "",
      roleId,
    },
  };
}

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
    const staffId = body?.staffId;
    const requestedLocationId = body?.locationId ?? null;
    const locale = normalizeLocale(body?.locale);

    if (!isUuid(companyId) || !isUuid(staffId)) {
      return jsonResponse({ success: false, error: "invitation_invalid" }, 400, origin);
    }
    if (requestedLocationId != null && !isUuid(requestedLocationId)) {
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

    const { data: staff, error: staffError } = await admin
      .from("staff")
      .select("id, company_id, email, first_name, last_name, user_id")
      .eq("id", staffId)
      .maybeSingle();
    if (staffError) throw staffError;
    const staffRow = staff as StaffRow | null;
    if (!staffRow || staffRow.company_id !== companyId) {
      return jsonResponse({ success: false, error: "invitation_staff_not_found" }, 404, origin);
    }
    if (staffRow.user_id) {
      return jsonResponse({ success: false, error: "invitation_already_has_login" }, 409, origin);
    }
    const email = normalizeEmail(staffRow.email);
    if (!email) {
      return jsonResponse({ success: false, error: "invitation_invalid_email" }, 400, origin);
    }
    const firstName = inviteFirstName(staffRow, email);
    const lastName = normalizeName(staffRow.last_name);

    const resolved = await resolveExistingStaffTarget(admin, {
      companyId,
      staffId,
      locationId: requestedLocationId,
    });
    if (!resolved.ok) {
      const status = resolved.error === "invitation_forbidden" ? 403 : 400;
      return jsonResponse({ success: false, error: resolved.error }, status, origin);
    }
    const { locationId, locationName, roleId } = resolved.target;

    const { data: role, error: roleError } = await admin
      .from("role")
      .select("id, name, scope, is_system, company_id")
      .eq("id", roleId)
      .maybeSingle();
    if (roleError) throw roleError;
    const roleRow = role as RoleRow | null;
    if (!roleRow || roleRow.scope !== "location") {
      return jsonResponse({ success: false, error: "invitation_role_scope" }, 400, origin);
    }
    if (!roleRow.is_system && roleRow.company_id !== companyId) {
      return jsonResponse({ success: false, error: "invitation_forbidden" }, 403, origin);
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

    const now = new Date().toISOString();
    const { error: revokeError } = await admin
      .from("invitation")
      .update({ status: "revoked", token_hash: null, updated_at: now })
      .eq("company_id", companyId)
      .eq("status", "pending")
      .eq("location_id", locationId)
      .ilike("email", email);
    if (revokeError) throw revokeError;

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const invitationRow = {
      company_id: companyId,
      staff_id: staffId,
      email,
      first_name: firstName,
      last_name: lastName,
      role_id: roleId,
      location_id: locationId,
      invited_by: session.id,
      status: "pending",
      token_hash: tokenHash,
      expires_at: expiresAt,
    };
    let { data: created, error: insertError } = await admin
      .from("invitation")
      .insert(invitationRow)
      .select("id")
      .single();
    // Production may not have invitation.staff_id yet. The accept path then
    // links the login by the staff email already stored on the invite.
    if (missingColumn(insertError, "staff_id")) {
      const { staff_id: _staffId, ...withoutStaffId } = invitationRow;
      const retry = await admin.from("invitation").insert(withoutStaffId).select("id").single();
      created = retry.data;
      insertError = retry.error;
    }
    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ success: false, error: "invitation_duplicate" }, 409, origin);
      }
      throw insertError;
    }
    if (!created) {
      throw new Error("invitation insert returned no row");
    }

    const base = salonOrigin(req);
    const path = `/${locale}/invite?token=${encodeURIComponent(token)}`;
    const inviteUrl = base ? `${base}${path}` : null;
    let emailSent = false;

    if (inviteUrl && Deno.env.get("RESEND_API_KEY")) {
      const safeCompany = escapeHtml(company.name ?? "Gleami");
      const safeName = escapeHtml([firstName, lastName].filter(Boolean).join(" "));
      const safeRole = escapeHtml(roleRow.name);
      const safeLocation = locationName ? escapeHtml(locationName) : "";
      const where = locationName
        ? `${safeCompany} (${safeLocation})`
        : safeCompany;
      try {
        await sendEmail({
          from: `${headerSafe(company.name ?? "Gleami")} <afspraken@notifications.salonify.co>`,
          to: [email],
          subject: `Create your login for ${headerSafe(company.name ?? "Gleami")}`,
          text: [
            `Hi ${firstName},`,
            "",
            `Create a login for your staff profile at ${company.name ?? "the salon"} as ${roleRow.name}.`,
            ...(locationName ? [`Location: ${locationName}`] : []),
            "",
            `Create your login: ${inviteUrl}`,
            "",
            "This link expires in 7 days.",
          ].join("\n"),
          html: `<p>Hi ${safeName},</p><p>Create a login for your staff profile at ${where} as <strong>${safeRole}</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Create your login</a></p><p>This link expires in 7 days.</p>`,
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
