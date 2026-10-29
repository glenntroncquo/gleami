export type ExecutionActor =
  | { type: "user"; userId: string }
  | { type: "system" };

/**
 * Built by trusted backend code from the persisted run plus freshly resolved
 * memberships. Nothing in here ever comes from model output: tools read the
 * tenant from this object, never from their arguments.
 */
export interface AuthorizedExecutionContext {
  runId: string;
  companyId: string;
  /** Shop the run is pinned to. Null means a company-wide run. */
  locationId: string | null;
  actor: ExecutionActor;
  /** Locations of `companyId` the actor may act at. */
  permittedLocationIds: string[];
}

export class ToolScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolScopeError";
  }
}

/**
 * The location a tool call may touch. A pinned run can only ever address its
 * own shop; a company-wide run may narrow to any shop the actor can access.
 * Returns null when the call stays company-wide.
 */
export function resolveToolLocation(
  context: AuthorizedExecutionContext,
  requestedLocationId: string | null | undefined,
): string | null {
  if (context.locationId) {
    if (requestedLocationId && requestedLocationId !== context.locationId) {
      throw new ToolScopeError("This run is limited to a single location");
    }
    return context.locationId;
  }

  if (!requestedLocationId) {
    return null;
  }

  if (!context.permittedLocationIds.includes(requestedLocationId)) {
    throw new ToolScopeError("Location is outside the permitted scope");
  }
  return requestedLocationId;
}

/** Membership ids narrowed to the run's company, so a sibling tenant never leaks in. */
export function permittedLocationsForCompany(
  companyId: string,
  locationRows: Array<{ id: string; companyId: string }>,
  memberLocationIds: string[],
): string[] {
  const member = new Set(memberLocationIds);
  return locationRows
    .filter((row) => row.companyId === companyId && member.has(row.id))
    .map((row) => row.id);
}
