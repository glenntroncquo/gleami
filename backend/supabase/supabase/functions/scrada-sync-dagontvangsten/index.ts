import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "@/shared/cors";
import { BadResponse, OkResponse } from "@/shared/responses";
import { createSupabaseClient } from "@/shared/supabase";
import { validateInput } from "@/shared/validation";
import { scradaSyncDagontvangstenSchema } from "./schema.ts";
import { scradaSyncDagontvangstenInFunction } from "./logic.ts";

Deno.serve(async (req) => {
  console.log("[scrada-sync-dagontvangsten] incoming", {
    method: req.method,
    url: req.url,
  });

  if (req.method === "OPTIONS") {
    console.log(
      "[scrada-sync-dagontvangsten] OPTIONS preflight → 204 (no Scrada call; browser may send POST next)",
    );
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[scrada-sync-dagontvangsten] rejected method", req.method);
    return new BadResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    console.log("[scrada-sync-dagontvangsten] POST body", {
      company_id: body?.company_id,
      payment_ids_count: Array.isArray(body?.payment_ids) ? body.payment_ids.length : 0,
    });

    const validationResult = validateInput(scradaSyncDagontvangstenSchema, body);
    if (validationResult instanceof BadResponse) {
      console.log("[scrada-sync-dagontvangsten] validation failed → BadResponse");
      return validationResult;
    }

    console.log("[scrada-sync-dagontvangsten] calling scradaSyncDagontvangstenInFunction");
    const supabase = createSupabaseClient();
    const result = await scradaSyncDagontvangstenInFunction(supabase, validationResult);

    console.log("[scrada-sync-dagontvangsten] success", {
      synced: result.synced,
      batches: result.batches.length,
    });

    return new OkResponse({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.log("[scrada-sync-dagontvangsten] error", message);
    return new BadResponse(
      "Failed to sync payments to Scrada dagontvangsten (journal)",
      400,
      message,
    );
  }
});
