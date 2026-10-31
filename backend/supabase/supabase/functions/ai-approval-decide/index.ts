import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCorsResponse, OkResponse, BadResponse } from "@/shared/responses";
import { rejectDisallowedOrigin } from "@/shared/cors";
import { validateInput } from "@/shared/validation";
import { RepositoryError, UnauthenticatedError, ForbiddenError } from "@/shared/errors";
import { getAuthContext } from "@/shared/auth-context";
import { requireCompanyPermission, requireLocationPermission } from "@/shared/auth-permission";
import { aiApprovalDecisionSchema } from "../_shared/ai/schema.ts";
import { aiRunRepository } from "../_shared/ai/repository.ts";
import { getTool } from "../_shared/ai/tools/registry.ts";
import { kickWorker } from "../_shared/ai/runtime/kick.ts";

/**
 * Approve or reject one pending AI action. The decider needs the same
 * permission the action itself requires at that scope; approving never
 * grants the agent more than the approver could do by hand.
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

    const input = validateInput(aiApprovalDecisionSchema, await req.json());
    if (input instanceof BadResponse) {
      return input;
    }

    const approval = await aiRunRepository.findApprovalById(input.approvalId);
    if (!approval || !authContext.companyIds.includes(approval.companyId)) {
      return new BadResponse("Approval not found", 404);
    }

    const tool = getTool(approval.toolName);
    if (!tool) {
      return new BadResponse("Approval refers to a tool that no longer exists", 409);
    }
    if (approval.locationId) {
      await requireLocationPermission(authContext, approval.locationId, tool.permission);
    } else {
      await requireCompanyPermission(authContext, approval.companyId, tool.permission);
    }

    const decided = await aiRunRepository.decideApproval(approval.id, input.decision, authContext.userId);
    if (!decided) {
      return new BadResponse("Approval was already decided", 409, undefined, "ALREADY_DECIDED");
    }

    if ((await aiRunRepository.countPendingApprovals(approval.runId)) === 0) {
      if (await aiRunRepository.resumeAfterApproval(approval.runId)) {
        kickWorker(approval.runId);
      }
    }

    return new OkResponse({ approval_id: approval.id, status: input.decision });
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
