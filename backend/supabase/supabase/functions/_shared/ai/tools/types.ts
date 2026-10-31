import type { z } from "zod";
import type { RiskLevel } from "../entity.ts";
import type { AuthorizedExecutionContext } from "../scope.ts";

export interface ToolScope {
  /** Already checked against the run's scope and the actor's memberships. */
  locationId: string | null;
}

/**
 * One capability every AI surface shares. Tools adapt existing domain
 * handlers; they do not hold business rules of their own. The tenant always
 * comes from the context, never from model-supplied arguments.
 */
export interface ToolDefinition<TInput = any, TOutput = unknown> {
  name: string;
  description: string;
  /** JSON Schema the model sees. `inputSchema` is what is actually enforced. */
  parameters: Record<string, unknown>;
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  risk: RiskLevel;
  /** Role permission key (see public.permission) the actor needs at the target scope. */
  permission: string;
  /** Safe to execute again when a worker crashed mid-call. */
  idempotent: boolean;
  requestedLocationId(input: TInput): string | null | undefined;
  execute(context: AuthorizedExecutionContext, input: TInput, scope: ToolScope): Promise<TOutput>;
}

/** Input errors go back to the model as a tool result so it can correct itself. */
export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolInputError";
  }
}

export const locationIdParameter = {
  type: "string",
  description:
    "Optional location id. Leave empty to use the run's location (or the company's primary location).",
} as const;
