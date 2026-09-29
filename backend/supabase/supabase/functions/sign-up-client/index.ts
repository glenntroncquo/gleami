import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret, x-supabase-webhook-secret"
};
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for(let i = 0; i < a.length; i++)out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
function extractProvidedSecret(req, body) {
  const h1 = req.headers.get("x-webhook-secret");
  if (h1) return h1.trim();
  const h2 = req.headers.get("x-supabase-webhook-secret");
  if (h2) return h2.trim();
  const auth = req.headers.get("Authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer && !bearer.includes(".")) return bearer; // non-JWT bearer = shared secret
  if (bearer && WEBHOOK_SECRET && timingSafeEqual(bearer, WEBHOOK_SECRET)) return bearer;
  const fromBody = body?.webhook_secret ?? body?.secret;
  if (typeof fromBody === "string" && fromBody.length > 0) return fromBody.trim();
  return null;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors
    });
  }
  try {
    if (!WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET env is not configured");
      return new Response(JSON.stringify({
        error: "Server misconfigured"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const body = await req.json();
    const provided = extractProvidedSecret(req, body);
    if (!provided || !timingSafeEqual(provided, WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({
        error: "Unauthorized webhook"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const { type, record } = body;
    if (type === "INSERT") {
      const { id, email, raw_user_meta_data } = record ?? {};
      const { first_name, last_name, phone } = raw_user_meta_data || {};
      const { data, error } = await supabase.from("client").upsert({
        user_id: id,
        email: email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "email"
      });
      if (error) {
        console.error("Database insert error:", error);
        return new Response(JSON.stringify({
          error: error.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
      return new Response(JSON.stringify({
        success: true,
        data
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Event processed"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
