import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const internalSecret = Deno.env.get("INTERNAL_WEBHOOK_SECRET") ?? "";
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
function extractBearer(req) {
  return req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}
function normalizeEmail(raw) {
  return String(raw ?? "").trim().toLowerCase();
}
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [
    ...new Uint8Array(digest)
  ].map((b)=>b.toString(16).padStart(2, "0")).join("");
}
function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [
    ...bytes
  ].map((b)=>b.toString(16).padStart(2, "0")).join("");
}
async function companyIdsForUser(userId) {
  const [companyResult, locationMembershipResult] = await Promise.all([
    supabaseAdmin.from("company_membership").select("company_id").eq("user_id", userId),
    supabaseAdmin.from("location_membership").select("location_id").eq("user_id", userId).eq("is_active", true)
  ]);
  if (companyResult.error) throw companyResult.error;
  if (locationMembershipResult.error) throw locationMembershipResult.error;
  const companyIds = new Set((companyResult.data ?? []).map((r)=>r.company_id));
  const locationIds = (locationMembershipResult.data ?? []).map((r)=>r.location_id);
  if (locationIds.length > 0) {
    const { data, error } = await supabaseAdmin.from("location").select("company_id").in("id", locationIds);
    if (error) throw error;
    for (const row of data ?? [])companyIds.add(row.company_id);
  }
  return [
    ...companyIds
  ];
}
async function getAuthContext(req) {
  const token = extractBearer(req);
  if (!token) throw Object.assign(new Error("Missing Authorization header"), {
    status: 401
  });
  if (token === anonKey || token === serviceRoleKey) {
    throw Object.assign(new Error("Authenticated user session required"), {
      status: 401
    });
  }
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("Invalid or expired session"), {
      status: 401
    });
  }
  return {
    userId: data.user.id,
    companyIds: await companyIdsForUser(data.user.id)
  };
}
async function userHasInvitePermission(userId, companyId) {
  const perms = [
    "staff:manage",
    "invites:manage"
  ];
  const { data: cm, error: cmErr } = await supabaseAdmin.from("company_membership").select("role_id").eq("user_id", userId).eq("company_id", companyId);
  if (cmErr) throw cmErr;
  const roleIds = new Set((cm ?? []).map((r)=>r.role_id).filter(Boolean));
  const { data: lm, error: lmErr } = await supabaseAdmin.from("location_membership").select("role_id, location_id").eq("user_id", userId).eq("is_active", true);
  if (lmErr) throw lmErr;
  const lmRows = lm ?? [];
  if (lmRows.length > 0) {
    const { data: locs, error: locErr } = await supabaseAdmin.from("location").select("id").in("id", lmRows.map((r)=>r.location_id)).eq("company_id", companyId);
    if (locErr) throw locErr;
    const allowedLocs = new Set((locs ?? []).map((r)=>r.id));
    for (const row of lmRows){
      if (allowedLocs.has(row.location_id) && row.role_id) roleIds.add(row.role_id);
    }
  }
  if (roleIds.size === 0) return false;
  const { data: rp, error: rpErr } = await supabaseAdmin.from("role_permission").select("permission_key").in("role_id", [
    ...roleIds
  ]).in("permission_key", perms);
  if (rpErr) throw rpErr;
  return (rp ?? []).length > 0;
}
async function requireInviteAccess(userId, companyIds, companyId) {
  if (!companyIds.includes(companyId)) {
    throw Object.assign(new Error(`Not authorized for company ${companyId}`), {
      status: 403
    });
  }
  const allowed = await userHasInvitePermission(userId, companyId);
  if (!allowed) {
    throw Object.assign(new Error("Missing staff:manage or invites:manage permission"), {
      status: 403
    });
  }
}
async function findAuthUserByEmail(email) {
  const admin = supabaseAdmin.auth.admin;
  if (typeof admin.getUserByEmail === "function") {
    const { data, error } = await admin.getUserByEmail(email);
    if (error && !String(error.message || "").toLowerCase().includes("not found")) throw error;
    const user = data?.user;
    if (user?.id) return {
      id: user.id,
      email: user.email ?? email
    };
  }
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (error) throw error;
  const user = (data?.users ?? []).find((u)=>(u.email ?? "").toLowerCase() === email);
  return user ? {
    id: user.id,
    email: user.email ?? email
  } : null;
}
async function dispatchInviteEmail(invitationId, token) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal-secret only: the service-role key must never be sent as
        // an external bearer credential (audit follow-up 2026-09-29).
        "x-internal-secret": internalSecret
      },
      body: JSON.stringify({
        invitation_id: invitationId,
        token
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("send-invitation-email failed", res.status, text);
    }
  } catch (err) {
    console.error("send-invitation-email invoke failed", err);
  }
}
async function handleCreate(input) {
  const { userId, companyId, email, roleId, locationId } = input;
  if (!email || !/[^\s@]+@[^\s@]+\.[^\s@]+/.test(email)) {
    return json(400, {
      success: false,
      error: "INVALID_EMAIL",
      message: "Valid email is required"
    });
  }
  const { data: role, error: roleErr } = await supabaseAdmin.from("role").select("id, name, scope, company_id").eq("id", roleId).maybeSingle();
  if (roleErr) throw roleErr;
  if (!role) return json(400, {
    success: false,
    error: "INVALID_ROLE",
    message: "role_id not found"
  });
  if (role.company_id && role.company_id !== companyId) {
    return json(400, {
      success: false,
      error: "INVALID_ROLE",
      message: "Role does not belong to this company"
    });
  }
  let resolvedLocationId = locationId;
  if (role.scope === "company") {
    resolvedLocationId = null;
  } else if (role.scope === "location") {
    if (!resolvedLocationId) {
      return json(400, {
        success: false,
        error: "LOCATION_REQUIRED",
        message: "location_id is required for location-scoped roles"
      });
    }
    const { data: loc, error: locErr } = await supabaseAdmin.from("location").select("id, company_id").eq("id", resolvedLocationId).maybeSingle();
    if (locErr) throw locErr;
    if (!loc || loc.company_id !== companyId) {
      return json(400, {
        success: false,
        error: "INVALID_LOCATION",
        message: "location_id is not in this company"
      });
    }
  } else {
    return json(400, {
      success: false,
      error: "INVALID_ROLE",
      message: `Unsupported role scope ${role.scope}`
    });
  }
  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    if (role.scope === "company") {
      const { data: existing } = await supabaseAdmin.from("company_membership").select("id").eq("user_id", existingUser.id).eq("company_id", companyId).maybeSingle();
      if (existing) return json(409, {
        success: false,
        error: "ALREADY_MEMBER",
        message: "User already has company membership"
      });
    } else if (resolvedLocationId) {
      const { data: existing } = await supabaseAdmin.from("location_membership").select("id").eq("user_id", existingUser.id).eq("location_id", resolvedLocationId).maybeSingle();
      if (existing) return json(409, {
        success: false,
        error: "ALREADY_MEMBER",
        message: "User already has location membership"
      });
    }
  }
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data: invitation, error: insertErr } = await supabaseAdmin.from("invitation").insert({
    company_id: companyId,
    email,
    status: "pending",
    location_id: resolvedLocationId,
    role_id: roleId,
    invited_by: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    accepted_at: null,
    email_sent_at: null,
    updated_at: new Date().toISOString()
  }).select("id, company_id, email, status, location_id, role_id, invited_by, expires_at, created_at").single();
  if (insertErr) {
    if (insertErr.code === "23505") {
      return json(409, {
        success: false,
        error: "PENDING_EXISTS",
        message: "A pending invitation already exists for this email"
      });
    }
    throw insertErr;
  }
  await dispatchInviteEmail(invitation.id, token);
  return json(200, {
    success: true,
    data: invitation,
    user_exists: !!existingUser
  });
}
async function handleResend(companyId, invitationId) {
  const { data: invitation, error } = await supabaseAdmin.from("invitation").select("id, company_id, status").eq("id", invitationId).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  if (!invitation) return json(404, {
    success: false,
    error: "NOT_FOUND",
    message: "Invitation not found"
  });
  if (invitation.status !== "pending") {
    return json(409, {
      success: false,
      error: "NOT_PENDING",
      message: "Only pending invitations can be resent"
    });
  }
  const token = newToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { data: updated, error: updErr } = await supabaseAdmin.from("invitation").update({
    token_hash: tokenHash,
    expires_at: expiresAt,
    email_sent_at: null,
    updated_at: new Date().toISOString()
  }).eq("id", invitationId).eq("status", "pending").select("id, company_id, email, status, location_id, role_id, invited_by, expires_at, created_at").maybeSingle();
  if (updErr) throw updErr;
  if (!updated) return json(409, {
    success: false,
    error: "NOT_PENDING",
    message: "Invitation is no longer pending"
  });
  await dispatchInviteEmail(updated.id, token);
  return json(200, {
    success: true,
    data: updated
  });
}
async function handleRevoke(companyId, invitationId) {
  const { data: updated, error } = await supabaseAdmin.from("invitation").update({
    status: "revoked",
    updated_at: new Date().toISOString()
  }).eq("id", invitationId).eq("company_id", companyId).eq("status", "pending").select("id, company_id, email, status, location_id, role_id, invited_by, expires_at, created_at").maybeSingle();
  if (error) throw error;
  if (!updated) return json(409, {
    success: false,
    error: "NOT_PENDING",
    message: "Only pending invitations can be revoked"
  });
  return json(200, {
    success: true,
    data: updated
  });
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
  if (req.method !== "POST") return json(405, {
    success: false,
    error: "METHOD_NOT_ALLOWED"
  });
  try {
    const auth = await getAuthContext(req);
    const body = await req.json().catch(()=>({}));
    const action = String(body?.action ?? "create");
    const companyId = String(body?.company_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
      return json(400, {
        success: false,
        error: "INVALID_COMPANY",
        message: "company_id is required"
      });
    }
    await requireInviteAccess(auth.userId, auth.companyIds, companyId);
    if (action === "create") {
      return await handleCreate({
        userId: auth.userId,
        companyId,
        email: normalizeEmail(body?.email),
        roleId: String(body?.role_id ?? ""),
        locationId: body?.location_id ? String(body.location_id) : null
      });
    }
    if (action === "resend" || action === "revoke") {
      const invitationId = String(body?.invitation_id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
        return json(400, {
          success: false,
          error: "INVALID_INVITATION",
          message: "invitation_id is required"
        });
      }
      return action === "resend" ? await handleResend(companyId, invitationId) : await handleRevoke(companyId, invitationId);
    }
    return json(400, {
      success: false,
      error: "INVALID_ACTION",
      message: "action must be create, resend, or revoke"
    });
  } catch (err) {
    const status = err.status ?? 500;
    console.error("staff-invite-create", err);
    return json(status, {
      success: false,
      error: status === 500 ? "INTERNAL" : "AUTH",
      message: err.message
    });
  }
});
