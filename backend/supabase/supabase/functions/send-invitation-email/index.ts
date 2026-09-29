// Recovered from deployed bundle (eszip) on 2026-09-29 and hardened:
// - Auth is the shared internal-secret guard only (x-internal-secret ==
//   INTERNAL_WEBHOOK_SECRET). The legacy x-webhook-secret / service-role
//   bearer fallbacks were removed the same day after the sole caller
//   (staff-invite-create) was cut over.
// - HTML-escapes company-provided values interpolated into the email HTML.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { INTERNAL_SECRET_HEADER, internalSecretMatches } from "@/shared/internal-secret";
import { UnauthenticatedError } from "@/shared/errors";
import { escapeHtml, sanitizeDisplayName } from "@/shared/escape-html";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const DEFAULT_INVITE_ACCEPT_URL = "https://salonify.co/nl/accept-invite";
function inviteAcceptBase() {
  const raw = (Deno.env.get("INVITE_ACCEPT_URL") ?? "").trim().replace(/\/$/, "");
  if (raw && !/app\.salonify\.co/i.test(raw)) return raw;
  return DEFAULT_INVITE_ACCEPT_URL;
}
const acceptUrlBase = inviteAcceptBase();
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": `authorization, x-client-info, apikey, content-type, ${INTERNAL_SECRET_HEADER}`,
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}
function isAuthorized(req: Request): boolean {
  return internalSecretMatches(
    req.headers.get(INTERNAL_SECRET_HEADER),
    Deno.env.get("INTERNAL_WEBHOOK_SECRET"),
  );
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
  if (!isAuthorized(req)) return json(401, {
    success: false,
    error: "UNAUTHORIZED"
  });
  try {
    const body = await req.json().catch(()=>({}));
    const invitationId = String(body?.invitation_id ?? body?.record?.id ?? "");
    const token = String(body?.token ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) {
      return json(400, {
        success: false,
        error: "INVALID_INVITATION"
      });
    }
    if (!token) {
      console.log("send-invitation-email skipped: no token (webhook-only payload)", invitationId);
      return json(200, {
        success: true,
        skipped: true,
        reason: "NO_TOKEN"
      });
    }
    const { data: invitation, error } = await supabaseAdmin.from("invitation").select("id, email, status, company_id, expires_at").eq("id", invitationId).maybeSingle();
    if (error) throw error;
    if (!invitation || invitation.status !== "pending") {
      return json(200, {
        success: true,
        skipped: true,
        reason: "NOT_PENDING"
      });
    }
    const { data: company } = await supabaseAdmin.from("company").select("name").eq("id", invitation.company_id).maybeSingle();
    const companyName = company?.name || "Salon";
    const companyNameHtml = escapeHtml(companyName);
    const acceptUrl = `${acceptUrlBase}?token=${encodeURIComponent(token)}`;
    const acceptUrlHtml = escapeHtml(acceptUrl);
    const subject = `Uitnodiging voor ${sanitizeDisplayName(companyName)}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto;padding:20px;">
<p>Hallo,</p>
<p>Je bent uitgenodigd om mee te werken bij <strong>${companyNameHtml}</strong>.</p>
<p><a href="${acceptUrlHtml}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">Uitnodiging accepteren</a></p>
<p style="font-size:12px;color:#666;word-break:break-all;">${acceptUrlHtml}</p>
<p>Deze link verloopt automatisch. Deel hem niet.</p>
<p>Met vriendelijke groet,<br>${companyNameHtml}</p>
</body></html>`;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY missing");
      return json(500, {
        success: false,
        error: "MAIL_NOT_CONFIGURED"
      });
    }
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `${sanitizeDisplayName(companyName)} <afspraken@notifications.salonify.co>`,
        to: [
          invitation.email
        ],
        subject,
        html,
        text: `Je bent uitgenodigd bij ${companyName}. Accepteer via: ${acceptUrl}`
      })
    });
    const resendData = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend failed", resendData);
      return json(502, {
        success: false,
        error: "MAIL_FAILED"
      });
    }
    await supabaseAdmin.from("invitation").update({
      email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", invitation.id);
    return json(200, {
      success: true,
      data: {
        invitation_id: invitation.id,
        resend_id: resendData?.id ?? null
      }
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return json(401, { success: false, error: "UNAUTHORIZED" });
    }
    console.error("send-invitation-email", err);
    return json(500, {
      success: false,
      error: "INTERNAL",
      message: (err as Error).message
    });
  }
});
