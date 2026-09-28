/**
 * ARCHIVED — verbatim source of the deployed `appointment-import-optios`
 * edge function, recovered before the function was deleted from Supabase.
 *
 * DO NOT DEPLOY AND DO NOT RUN. It targets a schema that no longer exists:
 *   - joins `client_company`, dropped in 20260906075929_drop_client_company.sql
 *   - writes appointment.treatment_id / price_option_id / duration_in_minutes /
 *     actual_start / actual_end / image_url, none of which exist any more
 *
 * Kept only as a reference for a future rewrite against the booking-segment model.
 * See ../README.md.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function bearerAuthorized(req) {
  const importSecret = Deno.env.get("OPTIOS_IMPORT_SECRET") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const bearer = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!bearer) return false;
  const eq = (a, b)=>{
    if (a.length !== b.length) return false;
    let o = 0;
    for(let i = 0; i < a.length; i++)o |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return o === 0;
  };
  return importSecret.length > 0 && eq(bearer, importSecret) || serviceRoleKey.length > 0 && eq(bearer, serviceRoleKey);
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders
  });
  if (!bearerAuthorized(req)) {
    return new Response(JSON.stringify({
      error: "Unauthorized — require OPTIOS_IMPORT_SECRET or service_role"
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    if (req.method === "POST") {
      const requestBody = await req.json();
      const { appointmentData, companyId, treatmentMapping, staffMapping, defaultPrice = 150, batchSize = 25 } = requestBody;
      if (!appointmentData) return new Response(JSON.stringify({
        error: "Missing appointmentData"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      if (!companyId) return new Response(JSON.stringify({
        error: "Missing companyId"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      if (!treatmentMapping) return new Response(JSON.stringify({
        error: "Missing treatmentMapping"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      if (!staffMapping) return new Response(JSON.stringify({
        error: "Missing staffMapping"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
      const allAppointments = [];
      Object.entries(appointmentData).forEach(([, dayData])=>{
        const day = dayData;
        allAppointments.push(...day.appointments.filter((apt)=>!apt.is_deleted));
      });
      let successCount = 0, errorCount = 0, clientNotFoundCount = 0, treatmentNotMappedCount = 0, staffNotMappedCount = 0;
      const errors = [];
      const clientsNotFound = [];
      const treatmentsNotMapped = [];
      const staffNotMapped = [];
      for(let i = 0; i < allAppointments.length; i += batchSize){
        const batch = allAppointments.slice(i, i + batchSize);
        for (const appointment of batch){
          const customer = appointment.customer;
          for (const block of appointment.blocks){
            const { data: clients, error: clientError } = await supabase.from("client").select("id, email, client_company!inner(company_id)").eq("first_name", customer.first_name).eq("last_name", customer.last_name).eq("client_company.company_id", companyId);
            if (clientError) {
              errors.push(`Error finding client ${customer.first_name} ${customer.last_name}: ${clientError.message}`);
              continue;
            }
            if (!clients || clients.length !== 1) {
              clientsNotFound.push(`${customer.first_name} ${customer.last_name}` + (clients && clients.length > 1 ? ` (multiple: ${clients.length})` : ""));
              clientNotFoundCount++;
              continue;
            }
            const client = clients[0];
            const activity = block.activity;
            const treatmentName = activity.name;
            const treatmentMap = treatmentMapping[treatmentName];
            if (!treatmentMap) {
              treatmentsNotMapped.push(treatmentName);
              treatmentNotMappedCount++;
              continue;
            }
            const candidateStaffIds = Object.entries(staffMapping).filter(([personId])=>personId === String(block.person_id)).map(([, staffId])=>staffId);
            if (candidateStaffIds.length === 0) {
              staffNotMapped.push(`person_id: ${block.person_id}`);
              staffNotMappedCount++;
              continue;
            }
            const startTime = new Date(block.starts_at);
            const endTime = new Date(block.ends_at);
            const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
            let inserted = false;
            for (const staffId of candidateStaffIds){
              const appointmentRecord = {
                staff_id: staffId,
                treatment_id: treatmentMap.treatmentId,
                client_id: client.id,
                company_id: companyId,
                price: defaultPrice,
                start: block.starts_at,
                end: block.ends_at,
                notes: appointment.notes || "",
                image_url: null,
                duration_in_minutes: durationInMinutes,
                price_option_id: treatmentMap.priceOptionId,
                actual_start: block.starts_at,
                actual_end: block.ends_at,
                is_canceled: false,
                cancel_reason: null,
                canceled_by: null,
                client_email: client.email,
                reminder_sent: false,
                confirmation_sent: false,
                image_path: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              const { error } = await supabase.from("appointment").insert(appointmentRecord);
              if (!error) {
                successCount++;
                inserted = true;
                break;
              } else if (!error.message.includes("no_overlap")) {
                errors.push(`Error inserting appointment for ${client.id}: ${error.message}`);
                break;
              }
            }
            if (!inserted) errorCount++;
          }
        }
      }
      return new Response(JSON.stringify({
        success: true,
        summary: {
          totalAppointments: allAppointments.reduce((sum, apt)=>sum + apt.blocks.length, 0),
          successfulImports: successCount,
          failedImports: errorCount,
          clientsNotFound: clientNotFoundCount,
          treatmentsNotMapped: treatmentNotMappedCount,
          staffNotMapped: staffNotMappedCount,
          companyId,
          details: {
            clientsNotFound: [
              ...new Set(clientsNotFound)
            ],
            treatmentsNotMapped: [
              ...new Set(treatmentsNotMapped)
            ],
            staffNotMapped: [
              ...new Set(staffNotMapped)
            ]
          },
          errors
        }
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        message: "Appointment Migration Edge Function (gated)",
        auth: "Authorization: Bearer <OPTIOS_IMPORT_SECRET> or service_role key"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
