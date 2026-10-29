import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { rejectDisallowedOrigin } from "@/shared/cors";
import { validateInput } from "@/shared/validation";
import { RepositoryError, UnauthenticatedError, ForbiddenError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireShopAccess } from "@/shared/auth-guard";
import { supabaseAdmin } from "@/shared/supabase";
import { locationRepository } from "../_shared/location/repository.ts";
import { aiCommandSchema } from "../_shared/ai/schema.ts";
import { getAgent } from "../_shared/ai/agents.ts";
import { aiRunRepository } from "../_shared/ai/repository.ts";
import { kickWorker } from "../_shared/ai/runtime/kick.ts";

/**
 * Accepts an AI request and persists it as a durable run. The work itself
 * happens in ai-worker, so this returns 202 with the run id straight away;
 * clients read progress from ai_agent_run / ai_agent_step (RLS: own runs).
 */
Deno.serve(async (req) => {
  const rejectedOrigin = rejectDisallowedOrigin(req);
  if (rejectedOrigin) {
    return rejectedOrigin;
  }
  if (req.method === "OPTIONS") {
    return createCorsResponse();
  }
  if (req.method !== "POST") {
    return new BadResponse("Method not allowed", 405);
  }

  try {
    const authContext = await getAuthContext(req);

    const input = validateInput(aiCommandSchema, await req.json());
    if (input instanceof BadResponse) {
      return input;
    }

    requireShopAccess(authContext, input.companyId, input.locationId);
    if (input.locationId) {
      const location = await locationRepository.findByIdForCompany(input.companyId, input.locationId);
      if (!location) {
        return new BadResponse("location_id does not belong to this company", 400, undefined, "INVALID_LOCATION");
      }
    }

    if (!getAgent(input.agentKey)) {
      return new BadResponse("Unknown agent", 400, undefined, "UNKNOWN_AGENT");
    }

    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: `ai-command:user:${authContext.userId}`,
      p_limit: 20,
      p_window_seconds: 60,
    });
    if (limitError) {
      throw new RepositoryError("Rate limit check failed", { cause: limitError });
    }
    if (allowed === false) {
      return new BadResponse("Too many AI requests, try again in a minute", 429);
    }

    const { run, created } = await aiRunRepository.createRun({
      companyId: input.companyId,
      locationId: input.locationId,
      agentKey: input.agentKey,
      actorType: "user",
      actorUserId: authContext.userId,
      input: { message: input.message },
      idempotencyKey: input.idempotencyKey,
    });

    if (created) {
      kickWorker(run.id);
    }

    return new OkResponse({ run_id: run.id, status: run.status }, 202);
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return new BadResponse(err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return new BadResponse(err.message, 403);
    }
    if (err instanceof RepositoryError) {
      console.error(err);
      return new BadResponse("Database query failed", 500);
    }
    console.error(err);
    return new BadResponse("Internal server error", 500);
  }
});
