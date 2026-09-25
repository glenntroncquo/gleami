import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { UnauthenticatedError } from "@/shared/errors";
import { assertWebhookSecret } from "../_shared/marketplace/assert-secret.ts";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { runDriftCheck } from "../_shared/marketplace/drift.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  const started = Date.now();
  try {
    assertWebhookSecret(req);
    const report = await runDriftCheck(getMarketplaceDb());
    console.log(JSON.stringify({
      msg: "marketplace-drift-check",
      ...report,
      elapsedMs: Date.now() - started,
    }));
    return new OkResponse({ ok: true, ...report });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new BadResponse(err.message, 401);
    console.error(err);
    return new BadResponse("Drift check failed", 500);
  }
});
