import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { ForbiddenError, RepositoryError } from "../infrastructure/errors.ts";
import { membershipIdsForUser } from "../infrastructure/auth/membership.ts";
import {
  userHasCompanyPermission,
  userHasLocationPermission,
} from "../infrastructure/auth/permission.ts";
import type { AgentRun } from "./entity.ts";
import { permittedLocationsForCompany, type AuthorizedExecutionContext } from "./scope.ts";

async function companyLocationRows(companyId: string): Promise<Array<{ id: string; companyId: string }>> {
  const { data, error } = await supabaseAdmin
    .from("location")
    .select("id, company_id")
    .eq("company_id", companyId);

  if (error) {
    throw new RepositoryError("Failed to load company locations", { cause: error });
  }
  return (data ?? []).map((row) => ({ id: row.id, companyId: row.company_id }));
}

/**
 * Re-resolves memberships on every attempt: a run can wait for approval or a
 * retry for minutes, and a removed staff member must not keep acting.
 */
export async function buildExecutionContext(run: AgentRun): Promise<AuthorizedExecutionContext> {
  const locationRows = await companyLocationRows(run.companyId);

  if (run.actorType === "system") {
    const all = locationRows.map((row) => row.id);
    if (run.locationId && !all.includes(run.locationId)) {
      throw new ForbiddenError("Run location does not belong to the run company");
    }
    return {
      runId: run.id,
      companyId: run.companyId,
      locationId: run.locationId,
      actor: { type: "system" },
      permittedLocationIds: all,
    };
  }

  if (!run.actorUserId) {
    throw new ForbiddenError("Run has no acting user");
  }

  const memberships = await membershipIdsForUser(run.actorUserId);
  if (!memberships.companyIds.includes(run.companyId)) {
    throw new ForbiddenError("Acting user no longer belongs to this company");
  }

  const permittedLocationIds = permittedLocationsForCompany(
    run.companyId,
    locationRows,
    memberships.locationIds,
  );
  if (run.locationId && !permittedLocationIds.includes(run.locationId)) {
    throw new ForbiddenError("Acting user no longer has access to this location");
  }

  return {
    runId: run.id,
    companyId: run.companyId,
    locationId: run.locationId,
    actor: { type: "user", userId: run.actorUserId },
    permittedLocationIds,
  };
}

/**
 * Location-targeted calls need the permission at that shop; company-wide
 * calls need a company-level role, so a single-shop stylist cannot read
 * every shop by leaving the location out.
 */
export async function actorHasPermission(
  context: AuthorizedExecutionContext,
  permission: string,
  locationId: string | null,
): Promise<boolean> {
  if (context.actor.type === "system") {
    return true;
  }
  if (locationId) {
    return await userHasLocationPermission(context.actor.userId, locationId, permission);
  }
  return await userHasCompanyPermission(context.actor.userId, context.companyId, permission);
}
