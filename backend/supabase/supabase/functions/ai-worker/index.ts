import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OkResponse, BadResponse } from "@/shared/responses";
import { validateInput } from "@/shared/validation";
import { UnauthenticatedError } from "@/shared/errors";
import { assertInternalSecret } from "@/shared/internal-secret";
import { aiWorkerSchema } from "../_shared/ai/schema.ts";
import { processRuns } from "../_shared/ai/runtime/worker.ts";
import { runInBackground } from "../_shared/ai/runtime/background.ts";

/**
 * Internal only (x-internal-secret). With `run_id` it works on that run;
 * without it, it sweeps due runs (retries, expired leases, resumed approvals).
 * Answers 202 at once and does the work in the background, so callers never
 * hold a connection open for a model round trip.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405);
  }

  try {
    assertInternalSecret(req);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return new BadResponse("Unauthorized", 401);
    }
    throw err;
  }

  const body = await req.json().catch(() => ({}));
  const input = validateInput(aiWorkerSchema, body);
  if (input instanceof BadResponse) {
    return input;
  }

  runInBackground(
    processRuns({ runId: input.runId })
      .then((report) => console.log("ai-worker", JSON.stringify(report)))
      .catch((error) => console.error("ai-worker failed", error)),
  );

  return new OkResponse({ accepted: true }, 202);
});
