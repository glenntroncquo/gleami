import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { rejectDisallowedOrigin } from "../_shared/infrastructure/http/cors.ts";
import {
  adminClient,
  findUserIdByEmail,
  jsonResponse,
  readSessionUser,
  sha256Hex,
} from "../_shared/invitation/edge-support.ts";

type InviteRow = {
  id: string;
  company_id: string;
  location_id: string | null;
  role_id: string;
  staff_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  expires_at: string | null;
};

type StaffLink = {
  linkedStaffId: string | null;
  updatedMembershipId: string | null;
  insertedMembershipId: string | null;
};

function isToken(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

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

async function loadInvite(
  admin: ReturnType<typeof adminClient>,
  tokenHash: string,
): Promise<InviteRow | null> {
  const withStaffId = await admin
    .from("invitation")
    .select("id, company_id, location_id, role_id, staff_id, email, first_name, last_name, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (missingColumn(withStaffId.error, "staff_id")) {
    const withoutStaffId = await admin
      .from("invitation")
      .select("id, company_id, location_id, role_id, email, first_name, last_name, status, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (withoutStaffId.error) throw withoutStaffId.error;
    return withoutStaffId.data
      ? { ...(withoutStaffId.data as Omit<InviteRow, "staff_id">), staff_id: null }
      : null;
  }
  if (withStaffId.error) throw withStaffId.error;
  return withStaffId.data as InviteRow | null;
}

function isExpired(row: InviteRow): boolean {
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() <= Date.now();
}

async function revert(admin: ReturnType<typeof adminClient>, id: string) {
  await admin
    .from("invitation")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "accepting");
}

async function undoStaffLink(
  admin: ReturnType<typeof adminClient>,
  link: StaffLink | null,
  userId: string | null,
) {
  if (!link || !userId) return;
  if (link.insertedMembershipId) {
    await admin.from("location_membership").delete().eq("id", link.insertedMembershipId);
  }
  if (link.updatedMembershipId) {
    await admin
      .from("location_membership")
      .update({ user_id: null })
      .eq("id", link.updatedMembershipId)
      .eq("user_id", userId);
  }
  if (link.linkedStaffId) {
    await admin.from("staff").update({ user_id: null }).eq("id", link.linkedStaffId).eq("user_id", userId);
  }
}

async function claimStaffUser(
  admin: ReturnType<typeof adminClient>,
  staffId: string,
  userId: string,
  companyId: string,
): Promise<{ ok: true; linkedStaffId: string | null } | { ok: false; error: "already_member" | "invalid" }> {
  const { data: staff, error } = await admin
    .from("staff")
    .select("id, user_id, company_id")
    .eq("id", staffId)
    .maybeSingle();
  if (error) throw error;
  if (!staff || staff.company_id !== companyId) return { ok: false, error: "invalid" };
  if (staff.user_id && staff.user_id !== userId) return { ok: false, error: "already_member" };
  if (staff.user_id === userId) return { ok: true, linkedStaffId: null };
  const { data: updated, error: linkError } = await admin
    .from("staff")
    .update({ user_id: userId })
    .eq("id", staffId)
    .is("user_id", null)
    .select("id");
  if (linkError) throw linkError;
  if (!updated?.[0]) return { ok: false, error: "already_member" };
  return { ok: true, linkedStaffId: staffId };
}

async function ensureLocationMembership(
  admin: ReturnType<typeof adminClient>,
  input: { staffId: string; userId: string; locationId: string; roleId: string },
): Promise<
  | { ok: true; updatedMembershipId: string | null; insertedMembershipId: string | null }
  | { ok: false; error: "already_member" | "invalid" }
> {
  const { data: memberships, error } = await admin
    .from("location_membership")
    .select("id, user_id, is_active")
    .eq("staff_id", input.staffId)
    .eq("location_id", input.locationId);
  if (error) throw error;
  const rows = memberships ?? [];
  const mine = rows.find((row) => row.user_id === input.userId);
  if (mine) {
    if (!mine.is_active) {
      const { error: activateError } = await admin
        .from("location_membership")
        .update({ is_active: true, role_id: input.roleId })
        .eq("id", mine.id);
      if (activateError) throw activateError;
    }
    return { ok: true, updatedMembershipId: null, insertedMembershipId: null };
  }
  const unlinked = rows.find((row) => !row.user_id);
  if (unlinked) {
    const { data: updated, error: updateError } = await admin
      .from("location_membership")
      .update({ user_id: input.userId, is_active: true, role_id: input.roleId })
      .eq("id", unlinked.id)
      .is("user_id", null)
      .select("id");
    if (updateError) {
      if (updateError.code === "23505") return { ok: false, error: "already_member" };
      throw updateError;
    }
    if (!updated?.[0]) return { ok: false, error: "already_member" };
    return { ok: true, updatedMembershipId: unlinked.id, insertedMembershipId: null };
  }
  if (rows.some((row) => row.user_id && row.user_id !== input.userId)) {
    return { ok: false, error: "already_member" };
  }
  const { data: inserted, error: insertError } = await admin
    .from("location_membership")
    .insert({
      user_id: input.userId,
      location_id: input.locationId,
      staff_id: input.staffId,
      role_id: input.roleId,
      is_active: true,
    })
    .select("id")
    .single();
  if (insertError) {
    if (insertError.code === "23505") return { ok: false, error: "already_member" };
    throw insertError;
  }
  return { ok: true, updatedMembershipId: null, insertedMembershipId: inserted.id };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonResponse({}, 204, origin).headers });
  }
  const rejected = rejectDisallowedOrigin(req);
  if (rejected) return rejected;
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "invalid" }, 405, origin);
  }

  const admin = adminClient();
  let claimedId: string | null = null;
  let createdUserId: string | null = null;
  let createdStaffId: string | null = null;
  let acceptedUserId: string | null = null;
  let staffLink: StaffLink | null = null;

  try {
    const body = await req.json().catch(() => null);
    const action = body?.action === "preview" ? "preview" : body?.action === "accept" ? "accept" : null;
    if (!action || !isToken(body?.token)) {
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }

    const tokenHash = await sha256Hex(body.token);
    const invite = await loadInvite(admin, tokenHash);
    if (!invite || invite.status !== "pending" || isExpired(invite)) {
      if (invite?.status === "pending" && isExpired(invite)) {
        await admin
          .from("invitation")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", invite.id)
          .eq("status", "pending");
      }
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }

    const [{ data: company }, { data: role }, locationResult] = await Promise.all([
      admin.from("company").select("name").eq("id", invite.company_id).maybeSingle(),
      admin.from("role").select("name, scope").eq("id", invite.role_id).maybeSingle(),
      invite.location_id
        ? admin.from("location").select("name, company_id").eq("id", invite.location_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (!role || (role.scope !== "company" && role.scope !== "location")) {
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }
    if (role.scope === "location" && (!invite.location_id || locationResult.data?.company_id !== invite.company_id)) {
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }
    if (role.scope === "company" && invite.location_id) {
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }

    if (action === "preview") {
      return jsonResponse(
        {
          success: true,
          email: invite.email,
          firstName: invite.first_name,
          lastName: invite.last_name,
          companyName: company?.name ?? "",
          locationName: locationResult.data?.name ?? null,
          roleName: role.name,
          roleScope: role.scope,
        },
        200,
        origin,
      );
    }

    const { data: claimedRows, error: claimError } = await admin
      .from("invitation")
      .update({ status: "accepting", updated_at: new Date().toISOString() })
      .eq("id", invite.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .select("id");
    if (claimError) throw claimError;
    const claimed = claimedRows?.[0];
    if (!claimed) {
      return jsonResponse({ success: false, error: "invalid" }, 400, origin);
    }
    claimedId = claimed.id;

    const existingUserId = await findUserIdByEmail(invite.email);
    let userId = existingUserId;
    if (existingUserId) {
      const session = await readSessionUser(req);
      if (!session || session.id !== existingUserId || session.email !== invite.email.toLowerCase()) {
        await revert(admin, claimed.id);
        claimedId = null;
        return jsonResponse({ success: false, error: "sign_in_required" }, 401, origin);
      }
    } else {
      const password = typeof body?.password === "string" ? body.password : "";
      if (password.length < 8 || password.length > 72) {
        await revert(admin, claimed.id);
        claimedId = null;
        return jsonResponse({ success: false, error: "weak_password" }, 400, origin);
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        app_metadata: { account_type: "salon_staff" },
        user_metadata: {
          full_name: `${invite.first_name ?? ""} ${invite.last_name ?? ""}`.trim(),
        },
      });
      if (createError || !created.user) {
        await revert(admin, claimed.id);
        claimedId = null;
        const duplicate = createError?.status === 422 ||
          (createError?.message ?? "").toLowerCase().includes("already");
        return jsonResponse(
          { success: false, error: duplicate ? "sign_in_required" : "invalid" },
          duplicate ? 401 : 500,
          origin,
        );
      }
      userId = created.user.id;
      createdUserId = created.user.id;
    }

    if (!userId) {
      await revert(admin, claimed.id);
      claimedId = null;
      return jsonResponse({ success: false, error: "invalid" }, 500, origin);
    }
    acceptedUserId = userId;

    const failMembership = async (status: number, error: string) => {
      await undoStaffLink(admin, staffLink, acceptedUserId);
      staffLink = null;
      if (createdStaffId) {
        await admin.from("staff").delete().eq("id", createdStaffId);
        createdStaffId = null;
      }
      if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
      await revert(admin, claimed.id);
      claimedId = null;
      createdUserId = null;
      return jsonResponse({ success: false, error }, status, origin);
    };

    if (invite.staff_id) {
      if (!invite.location_id || role.scope !== "location") {
        return await failMembership(400, "invalid");
      }
      const claimedStaff = await claimStaffUser(admin, invite.staff_id, userId, invite.company_id);
      if (!claimedStaff.ok) {
        return await failMembership(claimedStaff.error === "already_member" ? 409 : 400, claimedStaff.error);
      }
      staffLink = {
        linkedStaffId: claimedStaff.linkedStaffId,
        updatedMembershipId: null,
        insertedMembershipId: null,
      };
      const membership = await ensureLocationMembership(admin, {
        staffId: invite.staff_id,
        userId,
        locationId: invite.location_id,
        roleId: invite.role_id,
      });
      if (!membership.ok) {
        return await failMembership(membership.error === "already_member" ? 409 : 400, membership.error);
      }
      staffLink = {
        linkedStaffId: claimedStaff.linkedStaffId,
        updatedMembershipId: membership.updatedMembershipId,
        insertedMembershipId: membership.insertedMembershipId,
      };
    } else if (role.scope === "company") {
      const { error: membershipError } = await admin.from("company_membership").insert({
        user_id: userId,
        company_id: invite.company_id,
        role_id: invite.role_id,
      });
      if (membershipError) {
        if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
        await revert(admin, claimed.id);
        claimedId = null;
        createdUserId = null;
        const duplicate = membershipError.code === "23505";
        return jsonResponse(
          { success: false, error: duplicate ? "already_member" : "invalid" },
          duplicate ? 409 : 500,
          origin,
        );
      }
    } else {
      const { data: staffRows, error: staffLookupError } = await admin
        .from("staff")
        .select("id, user_id")
        .eq("company_id", invite.company_id)
        .ilike("email", invite.email)
        .limit(5);
      if (staffLookupError) throw staffLookupError;
      const staff = (staffRows ?? []).find((row) => row.user_id === userId) ??
        (staffRows ?? []).find((row) => !row.user_id) ??
        null;
      const ownedBySomeoneElse = (staffRows ?? []).some(
        (row) => row.user_id && row.user_id !== userId,
      );
      if (!staff && ownedBySomeoneElse) {
        if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
        await revert(admin, claimed.id);
        claimedId = null;
        createdUserId = null;
        return jsonResponse({ success: false, error: "already_member" }, 409, origin);
      }

      if (staff?.id && invite.location_id) {
        const claimedStaff = await claimStaffUser(admin, staff.id, userId, invite.company_id);
        if (!claimedStaff.ok) {
          return await failMembership(
            claimedStaff.error === "already_member" ? 409 : 400,
            claimedStaff.error,
          );
        }
        staffLink = {
          linkedStaffId: claimedStaff.linkedStaffId,
          updatedMembershipId: null,
          insertedMembershipId: null,
        };
        const membership = await ensureLocationMembership(admin, {
          staffId: staff.id,
          userId,
          locationId: invite.location_id,
          roleId: invite.role_id,
        });
        if (!membership.ok) {
          return await failMembership(
            membership.error === "already_member" ? 409 : 400,
            membership.error,
          );
        }
        staffLink = {
          linkedStaffId: claimedStaff.linkedStaffId,
          updatedMembershipId: membership.updatedMembershipId,
          insertedMembershipId: membership.insertedMembershipId,
        };
      } else {
        let staffId = staff?.id ?? null;
        if (!staffId) {
          const { data: inserted, error: staffInsertError } = await admin
            .from("staff")
            .insert({
              company_id: invite.company_id,
              user_id: userId,
              email: invite.email,
              first_name: invite.first_name,
              last_name: invite.last_name,
              status: "Active",
            })
            .select("id")
            .single();
          if (staffInsertError) throw staffInsertError;
          staffId = inserted.id;
          createdStaffId = inserted.id;
        } else if (!staff?.user_id) {
          const { error: linkError } = await admin
            .from("staff")
            .update({ user_id: userId })
            .eq("id", staffId)
            .is("user_id", null);
          if (linkError) throw linkError;
        }

        const { error: membershipError } = await admin.from("location_membership").insert({
          user_id: userId,
          location_id: invite.location_id,
          staff_id: staffId,
          role_id: invite.role_id,
          is_active: true,
        });
        if (membershipError) {
          if (createdStaffId) {
            await admin.from("staff").delete().eq("id", createdStaffId);
            createdStaffId = null;
          }
          if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
          await revert(admin, claimed.id);
          claimedId = null;
          createdUserId = null;
          const duplicate = membershipError.code === "23505";
          return jsonResponse(
            { success: false, error: duplicate ? "already_member" : "invalid" },
            duplicate ? 409 : 500,
            origin,
          );
        }
      }
    }

    const { error: acceptError } = await admin
      .from("invitation")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        token_hash: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
      .eq("status", "accepting");
    if (acceptError) throw acceptError;
    claimedId = null;

    return jsonResponse({ success: true, email: invite.email }, 200, origin);
  } catch (error) {
    console.error("invitation-accept failed", error);
    await undoStaffLink(admin, staffLink, acceptedUserId);
    if (createdStaffId) {
      await admin.from("staff").delete().eq("id", createdStaffId);
    }
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }
    if (claimedId) await revert(admin, claimedId);
    return jsonResponse({ success: false, error: "invalid" }, 500, origin);
  }
});
