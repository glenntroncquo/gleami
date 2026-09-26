import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { UnauthenticatedError } from "@/shared/errors";
import { assertWebhookSecret } from "../_shared/marketplace/assert-secret.ts";
import { getMarketplaceDb } from "../_shared/marketplace/db.ts";
import { locationIdsForService, rebuildAllListed, rebuildLocations } from "../_shared/marketplace/rebuild.ts";
import { targetsFromWebhook } from "../_shared/marketplace/webhook.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse();
  if (req.method !== "POST") return new BadResponse("Method not allowed", 405);

  const started = Date.now();
  try {
    assertWebhookSecret(req);
    const target = targetsFromWebhook(await req.json().catch(() => null));
    const sql = getMarketplaceDb();
    // Triggers call supabase_functions.http_request with a static body `{}`.
    // That payload has no table or record ids, so targetsFromWebhook returns
    // ignore. Rebuild every listed location instead of zero rows. A body
    // that names a location or service still rebuilds only those rows.
    let rebuilt: number;
    if (target.kind === "ignore") {
      rebuilt = (await rebuildAllListed(sql)).rebuilt;
    } else {
      const locationIds = target.kind === "locations"
        ? target.locationIds
        : await locationIdsForService(sql, target.serviceId);
      rebuilt = await rebuildLocations(sql, locationIds);
    }
    console.log(JSON.stringify({
      msg: "marketplace-sync",
      kind: target.kind,
      rebuilt,
      elapsedMs: Date.now() - started,
    }));
    return new OkResponse({ ok: true, rebuilt });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new BadResponse(err.message, 401);
    console.error(err);
    return new BadResponse("Sync failed", 500);
  }
});
