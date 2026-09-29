// ---------------------------------------------------------------------------
// RECOVERED SOURCE - NOT FROM REPOSITORY HISTORY
// Recovered verbatim from the deployed Supabase Edge Function
// "scrada-add-cashbook-lines" (project kvhinnhnwgvdpzggdnxs, version 13,
// status ACTIVE, verify_jwt=true) because no source for this function existed
// in this repository at the time of recovery.
// Extracted from the deployed ESZIP bundle's sourcemap sourcesContent entry
// for functions/scrada-add-cashbook-lines/index.ts (nothing hand-retyped),
// then given the caller check it never had (audit finding C9).
// ---------------------------------------------------------------------------
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, rejectDisallowedOrigin } from "@/shared/cors";
import { BadResponse, OkResponse } from "@/shared/responses";
import { createSupabaseClient } from "@/shared/supabase";
import { validateInput } from "@/shared/validation";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyAccess } from "@/shared/auth-guard";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import { scradaAddCashbookLinesSchema } from "./schema.ts";
import { scradaAddCashbookLinesInFunction } from "./logic.ts";

Deno.serve(async (req) => {
  console.log("[scrada-add-cashbook-lines] incoming", {
    method: req.method,
    url: req.url,
  });

  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) {
    return rejectedOrigin;
  }

  if (req.method === "OPTIONS") {
    console.log(
      "[scrada-add-cashbook-lines] OPTIONS preflight → 204 (no Scrada call; browser may send POST next)",
    );
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[scrada-add-cashbook-lines] rejected method", req.method);
    return new BadResponse("Method not allowed", 405);
  }

  try {
    const authContext = await getAuthContext(req);

    const body = await req.json();
    console.log("[scrada-add-cashbook-lines] POST body", {
      company_id: body?.company_id,
      payment_ids_count: Array.isArray(body?.payment_ids) ? body.payment_ids.length : 0,
    });

    const validationResult = validateInput(scradaAddCashbookLinesSchema, body);
    if (validationResult instanceof BadResponse) {
      console.log("[scrada-add-cashbook-lines] validation failed → BadResponse");
      return validationResult;
    }

    // Everything past this point runs service-role: it reads this company's
    // Scrada API credentials, posts accounting lines to their books, and
    // stamps payment.cashbook_id. company_id and payment_ids both come from
    // the request, so the caller has to be proven a member of that company
    // first or this is a cross-tenant accounting write.
    requireCompanyAccess(authContext, validationResult.company_id);

    console.log("[scrada-add-cashbook-lines] calling scradaAddCashbookLinesInFunction");
    const supabase = createSupabaseClient();
    const result = await scradaAddCashbookLinesInFunction(supabase, validationResult);

    console.log("[scrada-add-cashbook-lines] success", {
      synced: result.synced,
      batches: result.batches.length,
    });

    return new OkResponse({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof UnauthenticatedError) {
      return new BadResponse("Unauthorized", 401);
    }
    if (error instanceof ForbiddenError) {
      return new BadResponse("Forbidden", 403);
    }
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    console.log("[scrada-add-cashbook-lines] error", message);
    return new BadResponse("Failed to sync payments to Scrada cash book", 400, message);
  }
});
