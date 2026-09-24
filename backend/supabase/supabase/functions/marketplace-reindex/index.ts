import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { requireServiceRole } from "@/shared/require-service-role";
import { ForbiddenError, UnauthenticatedError } from "@/shared/errors";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { rebuildAllListed } from "../_shared/marketplace/rebuild.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  const started = Date.now();
  try {
    requireServiceRole(req);
    const result = await rebuildAllListed(getMarketplaceDb());
    console.log(JSON.stringify({
      msg: "marketplace-reindex",
      ...result,
      elapsedMs: Date.now() - started,
    }));
    return new OkResponse({ ok: true, ...result });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new BadResponse(err.message, 401);
    if (err instanceof ForbiddenError) return new BadResponse(err.message, 403);
    console.error(err);
    return new BadResponse("Reindex failed", 500);
  }
});
