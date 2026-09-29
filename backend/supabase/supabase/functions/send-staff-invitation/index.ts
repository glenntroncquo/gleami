import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  return new Response(JSON.stringify({
    success: false,
    error: "INVITE_REBUILT",
    message: "send-staff-invitation is retired. Use staff-invite-create / staff-invite-accept."
  }), {
    status: 410,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
});
