import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
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
function maskEmail(email) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, name.length - 1))}@${domain}`;
}
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [
    ...new Uint8Array(digest)
  ].map((b)=>b.toString(16).padStart(2, "0")).join("");
}
async function findInvitationByToken(token) {
  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabaseAdmin.from("invitation").select("id, company_id, email, status, location_id, role_id, expires_at, accepted_at").eq("token_hash", tokenHash).maybeSingle();
  if (error) throw error;
  return data;
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
async function tryGetSessionUser(req) {
  const token = extractBearer(req);
  if (!token || token === anonKey || token === serviceRoleKey) return null;
  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return {
    id: data.user.id,
    email: (data.user.email ?? "").toLowerCase()
  };
}
function invitationPublic(inv, userExists) {
  return {
    status: inv.status,
    email_hint: maskEmail(inv.email),
    email: inv.email,
    expires_at: inv.expires_at,
    company_id: inv.company_id,
    location_id: inv.location_id,
    role_id: inv.role_id,
    user_exists: userExists
  };
}
async function markExpired(id) {
  await supabaseAdmin.from("invitation").update({
    status: "expired",
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("status", "pending");
}
async function writeMembership(input) {
  const { data: role, error: roleErr } = await supabaseAdmin.from("role").select("id, scope").eq("id", input.roleId).maybeSingle();
  if (roleErr) throw roleErr;
  if (!role) throw Object.assign(new Error("Invitation role is missing"), {
    status: 409
  });
  if (role.scope === "company") {
    const { error } = await supabaseAdmin.from("company_membership").insert({
      user_id: input.userId,
      company_id: input.companyId,
      role_id: input.roleId
    });
    if (error && error.code !== "23505") throw error;
    return {
      kind: "company_membership"
    };
  }
  if (!input.locationId) {
    throw Object.assign(new Error("Invitation is missing location_id"), {
      status: 409
    });
  }
  const { error } = await supabaseAdmin.from("location_membership").insert({
    user_id: input.userId,
    location_id: input.locationId,
    role_id: input.roleId,
    is_active: true
  });
  if (error && error.code !== "23505") throw error;
  return {
    kind: "location_membership"
  };
}
async function handlePreview(token) {
  const invitation = await findInvitationByToken(token);
  if (!invitation) return json(404, {
    success: false,
    error: "INVALID_TOKEN"
  });
  if (invitation.status === "pending" && invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
    await markExpired(invitation.id);
    return json(410, {
      success: false,
      error: "EXPIRED"
    });
  }
  if (invitation.status !== "pending") {
    return json(409, {
      success: false,
      error: invitation.status.toUpperCase(),
      ...invitationPublic(invitation, false)
    });
  }
  const existing = await findAuthUserByEmail(invitation.email);
  return json(200, {
    success: true,
    data: invitationPublic(invitation, !!existing)
  });
}
async function handleAccept(req, token, password) {
  const invitation = await findInvitationByToken(token);
  if (!invitation) return json(404, {
    success: false,
    error: "INVALID_TOKEN"
  });
  if (invitation.status !== "pending") return json(409, {
    success: false,
    error: invitation.status.toUpperCase()
  });
  if (!invitation.role_id) return json(409, {
    success: false,
    error: "INVALID_INVITE"
  });
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
    await markExpired(invitation.id);
    return json(410, {
      success: false,
      error: "EXPIRED"
    });
  }
  const existing = await findAuthUserByEmail(invitation.email);
  const sessionUser = await tryGetSessionUser(req);
  let userId;
  if (existing) {
    if (!sessionUser) {
      return json(409, {
        success: false,
        error: "LOGIN_REQUIRED",
        message: "Log in with the invited email to accept",
        data: invitationPublic(invitation, true)
      });
    }
    if (sessionUser.email !== invitation.email) {
      return json(403, {
        success: false,
        error: "EMAIL_MISMATCH",
        message: "Signed-in email does not match this invite"
      });
    }
    userId = sessionUser.id;
  } else {
    if (sessionUser) {
      return json(403, {
        success: false,
        error: "EMAIL_MISMATCH",
        message: "Signed-in user does not match this invite"
      });
    }
    if (!password || password.length < 8) {
      return json(400, {
        success: false,
        error: "PASSWORD_REQUIRED",
        message: "Password must be at least 8 characters"
      });
    }
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true
    });
    if (createErr || !created.user?.id) {
      console.error("createUser failed", createErr);
      return json(500, {
        success: false,
        error: "USER_CREATE_FAILED",
        message: createErr?.message
      });
    }
    userId = created.user.id;
  }
  const membership = await writeMembership({
    userId,
    companyId: invitation.company_id,
    locationId: invitation.location_id,
    roleId: invitation.role_id
  });
  const { error: accErr } = await supabaseAdmin.from("invitation").update({
    status: "accepted",
    accepted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", invitation.id).eq("status", "pending");
  if (accErr) throw accErr;
  return json(200, {
    success: true,
    data: {
      invitation_id: invitation.id,
      user_id: userId,
      membership: membership.kind,
      status: "accepted"
    }
  });
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
  try {
    if (req.method === "GET") {
      const token = new URL(req.url).searchParams.get("token") ?? "";
      if (!token) return json(400, {
        success: false,
        error: "TOKEN_REQUIRED"
      });
      return await handlePreview(token);
    }
    if (req.method !== "POST") return json(405, {
      success: false,
      error: "METHOD_NOT_ALLOWED"
    });
    const body = await req.json().catch(()=>({}));
    const token = String(body?.token ?? "");
    const password = body?.password == null ? null : String(body.password);
    if (!token) return json(400, {
      success: false,
      error: "TOKEN_REQUIRED"
    });
    return await handleAccept(req, token, password);
  } catch (err) {
    console.error("staff-invite-accept", err);
    const status = err.status ?? 500;
    return json(status, {
      success: false,
      error: "INTERNAL",
      message: err.message
    });
  }
});
