import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, OPTIONS" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (!auth.toLowerCase().startsWith("bearer ")) return respond(401, { error: "Sign in required" });
  const client = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return respond(401, { error: "Sign in required" });
  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.from("company_setup").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return respond(500, { error: "Could not load setup" });
  return respond(200, { setup: data });
});
