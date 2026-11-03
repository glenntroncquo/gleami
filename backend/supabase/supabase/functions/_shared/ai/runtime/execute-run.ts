import { BookingLocationError, ForbiddenError, RepositoryError } from "../../infrastructure/errors.ts";
import { buildSystemPrompt, getAgent, type AgentDefinition } from "../agents.ts";
import { actorHasPermission, buildExecutionContext } from "../context.ts";
import type { AgentRun, AgentStep, ToolCall } from "../entity.ts";
import { ModelProviderError, type ModelProvider } from "../model/types.ts";
import { decideToolExecution, retryDelaySeconds } from "../policy.ts";
import { aiRunRepository as repo } from "../repository.ts";
import { resolveToolLocation, ToolScopeError, type AuthorizedExecutionContext } from "../scope.ts";
import { getTool, toolsForAgent } from "../tools/registry.ts";
import { ToolInputError, type ToolDefinition } from "../tools/types.ts";
import {
  buildConversation,
  countModelSteps,
  nextAction,
  nextSequence,
} from "../transcript.ts";

export type RunAttemptResult =
  | "succeeded"
  | "failed"
  | "awaiting_approval"
  | "yielded"
  | "retry_scheduled"
  | "lease_lost";

export interface ExecuteRunOptions {
  leaseOwner: string;
  leaseSeconds: number;
  /** No new step starts after this instant; the run is re-queued instead. */
  startStepsBefore: number;
  model: ModelProvider;
  onRequeued?: (runId: string) => void;
}

class LeaseLostError extends Error {}

class TerminalRunError extends Error {}

type ToolCallOutcome = "continue" | "paused";

function stepFailure(error: unknown): string | null {
  if (
    error instanceof ToolInputError ||
    error instanceof ToolScopeError ||
    error instanceof BookingLocationError ||
    error instanceof ForbiddenError
  ) {
    return error.message;
  }
  return null;
}

async function recordFailedToolStep(
  run: AgentRun,
  steps: AgentStep[],
  toolCall: ToolCall,
  existingStep: AgentStep | null,
  message: string,
  input: unknown,
): Promise<void> {
  if (existingStep) {
    await repo.finishStep(existingStep.id, { status: "failed", error: message });
    return;
  }
  await repo.insertStep({
    runId: run.id,
    companyId: run.companyId,
    sequence: nextSequence(steps),
    kind: "tool",
    status: "failed",
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    input,
    error: message,
  });
}

function parseArguments(raw: string): unknown {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    throw new ToolInputError("Arguments are not valid JSON");
  }
}

async function handleToolCall(params: {
  run: AgentRun;
  agent: AgentDefinition;
  context: AuthorizedExecutionContext;
  steps: AgentStep[];
  toolCall: ToolCall;
  existingStep: AgentStep | null;
}): Promise<ToolCallOutcome> {
  const { run, agent, context, steps, toolCall, existingStep } = params;

  const tool: ToolDefinition | null = agent.toolNames.includes(toolCall.name)
    ? getTool(toolCall.name)
    : null;
  if (!tool) {
    await recordFailedToolStep(run, steps, toolCall, existingStep, `Unknown tool ${toolCall.name}`, toolCall.arguments);
    return "continue";
  }

  // A resumed step replays the input stored when it was first validated (and,
  // for approvals, the exact input the human approved).
  const rawInput = existingStep ? existingStep.input : null;
  let input: unknown;
  let locationId: string | null;
  try {
    const candidate = existingStep ? rawInput : parseArguments(toolCall.arguments);
    const parsed = tool.inputSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new ToolInputError(
        parsed.error.errors.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; "),
      );
    }
    input = parsed.data;
    locationId = resolveToolLocation(context, tool.requestedLocationId(parsed.data));
    if (!(await actorHasPermission(context, tool.permission, locationId))) {
      throw new ForbiddenError(`You do not have the ${tool.permission} permission needed for ${tool.name}`);
    }
  } catch (error) {
    const message = stepFailure(error);
    if (message === null) throw error;
    await recordFailedToolStep(run, steps, toolCall, existingStep, message, rawInput ?? toolCall.arguments);
    return "continue";
  }

  const approval = existingStep?.approvalId ? await repo.findApprovalById(existingStep.approvalId) : null;
  const decision = decideToolExecution({
    risk: tool.risk,
    autoApproveUpTo: agent.autoApproveUpTo,
    approvalStatus: approval?.status ?? null,
  });

  switch (decision.kind) {
    case "wait_for_approval":
      return "paused";
    case "reject":
      await repo.finishStep(existingStep!.id, { status: "rejected" });
      return "continue";
    case "request_approval": {
      const requested = await repo.requestApproval({
        runId: run.id,
        companyId: run.companyId,
        locationId,
        toolCallId: toolCall.id,
        toolName: tool.name,
        toolInput: input,
        risk: tool.risk,
      });
      await repo.insertStep({
        runId: run.id,
        companyId: run.companyId,
        sequence: nextSequence(steps),
        kind: "tool",
        status: "awaiting_approval",
        toolCallId: toolCall.id,
        toolName: tool.name,
        input,
        approvalId: requested.id,
      });
      return "paused";
    }
    case "execute":
      break;
  }

  if (existingStep?.status === "running" && !tool.idempotent) {
    await repo.finishStep(existingStep.id, {
      status: "failed",
      error: "Interrupted while running and not retried automatically because it may already have taken effect",
    });
    return "continue";
  }

  let step = existingStep;
  if (!step) {
    step = await repo.insertStep({
      runId: run.id,
      companyId: run.companyId,
      sequence: nextSequence(steps),
      kind: "tool",
      status: "running",
      toolCallId: toolCall.id,
      toolName: tool.name,
      input,
    });
  } else if (step.status !== "running") {
    await repo.finishStep(step.id, { status: "running" });
  }

  try {
    const output = await tool.execute(context, input, { locationId });
    await repo.finishStep(step.id, { status: "succeeded", output, error: null });
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    const message = stepFailure(error);
    if (message === null) {
      console.error(`ai tool ${tool.name} failed`, error);
    }
    await repo.finishStep(step.id, {
      status: "failed",
      error: message ?? "The tool failed unexpectedly",
    });
  }
  return "continue";
}

async function drive(run: AgentRun, options: ExecuteRunOptions): Promise<RunAttemptResult> {
  const agent = getAgent(run.agentKey);
  if (!agent) {
    throw new TerminalRunError(`Unknown agent ${run.agentKey}`);
  }
  const toolSpecs = toolsForAgent(agent.toolNames).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
  const context = await buildExecutionContext(run);
  const systemPrompt = buildSystemPrompt(agent, run.createdAt);

  while (true) {
    if (Date.now() > options.startStepsBefore) {
      await repo.releaseRun(run.id, options.leaseOwner, {
        status: "queued",
        nextAttemptAt: new Date().toISOString(),
      });
      options.onRequeued?.(run.id);
      return "yielded";
    }
    if (!(await repo.extendLease(run.id, options.leaseOwner, options.leaseSeconds))) {
      throw new LeaseLostError();
    }

    const steps = await repo.listSteps(run.id);
    const action = nextAction(steps);

    if (action.type === "finish") {
      await repo.releaseRun(run.id, options.leaseOwner, {
        status: "succeeded",
        output: { message: action.content },
        error: null,
      });
      return "succeeded";
    }

    if (action.type === "handle_tool_call") {
      const outcome = await handleToolCall({
        run,
        agent,
        context,
        steps,
        toolCall: action.toolCall,
        existingStep: action.existingStep,
      });
      if (outcome === "paused") {
        await repo.releaseRun(run.id, options.leaseOwner, { status: "awaiting_approval" });
        // A decision may have landed while we still held the lease; resumeAfterApproval
        // would then have found the run still "running" and done nothing.
        if ((await repo.countPendingApprovals(run.id)) === 0 && (await repo.resumeAfterApproval(run.id))) {
          options.onRequeued?.(run.id);
          return "yielded";
        }
        return "awaiting_approval";
      }
      continue;
    }

    if (countModelSteps(steps) >= agent.maxModelCalls) {
      throw new TerminalRunError("The assistant needed too many steps to finish this request");
    }

    const response = await options.model.complete({
      messages: buildConversation({ systemPrompt, userMessage: run.input.message, steps }),
      tools: toolSpecs,
    });
    await repo.insertStep({
      runId: run.id,
      companyId: run.companyId,
      sequence: nextSequence(steps),
      kind: "model",
      status: "succeeded",
      output: { content: response.content, toolCalls: response.toolCalls },
      model: response.model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });
  }
}

/** Runs one claimed attempt. Never throws: every outcome is persisted on the run. */
export async function executeClaimedRun(
  run: AgentRun,
  options: ExecuteRunOptions,
): Promise<RunAttemptResult> {
  try {
    return await drive(run, options);
  } catch (error) {
    if (error instanceof LeaseLostError) {
      return "lease_lost";
    }

    const retryable = (error instanceof ModelProviderError && error.retryable) ||
      error instanceof RepositoryError;
    const message = error instanceof Error ? error.message : String(error);

    if (retryable) {
      const attempt = run.attemptCount + 1;
      if (attempt < run.maxAttempts) {
        console.warn(`ai run ${run.id} attempt ${attempt} failed, retrying`, error);
        await repo.releaseRun(run.id, options.leaseOwner, {
          status: "queued",
          error: message,
          attemptCount: attempt,
          nextAttemptAt: new Date(Date.now() + retryDelaySeconds(attempt) * 1000).toISOString(),
        });
        return "retry_scheduled";
      }
    }

    if (!(error instanceof TerminalRunError) && !(error instanceof ForbiddenError)) {
      console.error(`ai run ${run.id} failed`, error);
    }
    await repo.releaseRun(run.id, options.leaseOwner, {
      status: "failed",
      error: message,
    }).catch((releaseError) => console.error(`ai run ${run.id}: could not record failure`, releaseError));
    return "failed";
  }
}
