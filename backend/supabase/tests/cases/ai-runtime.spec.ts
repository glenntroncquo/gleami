import { describe, expect, it } from "vitest";
import {
  permittedLocationsForCompany,
  resolveToolLocation,
  ToolScopeError,
  type AuthorizedExecutionContext,
} from "../../supabase/functions/_shared/ai/scope.ts";
import {
  decideToolExecution,
  isAutoApproved,
  retryDelaySeconds,
} from "../../supabase/functions/_shared/ai/policy.ts";
import {
  buildConversation,
  countModelSteps,
  nextAction,
  nextSequence,
} from "../../supabase/functions/_shared/ai/transcript.ts";
import { agentKeys, getAgent } from "../../supabase/functions/_shared/ai/agents.ts";
import type { AgentStep } from "../../supabase/functions/_shared/ai/entity.ts";

const companyA = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const companyB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const shopA1 = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";
const shopA2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const shopB1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function context(overrides: Partial<AuthorizedExecutionContext> = {}): AuthorizedExecutionContext {
  return {
    runId: "run-1",
    companyId: companyA,
    locationId: null,
    actor: { type: "user", userId: "user-1" },
    permittedLocationIds: [shopA1, shopA2],
    ...overrides,
  };
}

let stepCounter = 0;
function step(partial: Partial<AgentStep> & Pick<AgentStep, "sequence" | "kind" | "status">): AgentStep {
  stepCounter += 1;
  return {
    id: `step-${stepCounter}`,
    runId: "run-1",
    toolCallId: null,
    toolName: null,
    input: null,
    output: null,
    error: null,
    approvalId: null,
    ...partial,
  };
}

function modelStep(sequence: number, toolCalls: Array<{ id: string; name: string }>, content: string | null = null) {
  return step({
    sequence,
    kind: "model",
    status: "succeeded",
    output: { content, toolCalls: toolCalls.map((call) => ({ ...call, arguments: "{}" })) },
  });
}

function toolStep(sequence: number, toolCallId: string, status: AgentStep["status"], output: unknown = null) {
  return step({ sequence, kind: "tool", status, toolCallId, toolName: "service_list", output });
}

describe("AI tool scope", () => {
  it("pins a location-scoped run to its own shop", () => {
    const pinned = context({ locationId: shopA1, permittedLocationIds: [shopA1] });
    expect(resolveToolLocation(pinned, undefined)).toBe(shopA1);
    expect(resolveToolLocation(pinned, shopA1)).toBe(shopA1);
    expect(() => resolveToolLocation(pinned, shopA2)).toThrow(ToolScopeError);
  });

  it("lets a company-wide run narrow only to permitted shops", () => {
    expect(resolveToolLocation(context(), null)).toBeNull();
    expect(resolveToolLocation(context(), shopA2)).toBe(shopA2);
    expect(() => resolveToolLocation(context(), shopB1)).toThrow(ToolScopeError);
  });

  it("never carries another tenant's shops into the run, even for a multi-company member", () => {
    const permitted = permittedLocationsForCompany(
      companyA,
      [
        { id: shopA1, companyId: companyA },
        { id: shopA2, companyId: companyA },
        { id: shopB1, companyId: companyB },
      ],
      [shopA1, shopB1],
    );
    expect(permitted).toEqual([shopA1]);
  });
});

describe("AI approval policy", () => {
  it("auto-runs only up to the agent's level", () => {
    expect(isAutoApproved("low", "low")).toBe(true);
    expect(isAutoApproved("medium", "low")).toBe(false);
    expect(isAutoApproved("low", "none")).toBe(false);
    expect(isAutoApproved("high", "high")).toBe(true);
  });

  it("asks for approval above the threshold and honours the decision", () => {
    const base = { risk: "high" as const, autoApproveUpTo: "low" as const };
    expect(decideToolExecution({ ...base, approvalStatus: null })).toEqual({ kind: "request_approval" });
    expect(decideToolExecution({ ...base, approvalStatus: "pending" })).toEqual({ kind: "wait_for_approval" });
    expect(decideToolExecution({ ...base, approvalStatus: "approved" })).toEqual({ kind: "execute" });
    expect(decideToolExecution({ ...base, approvalStatus: "rejected" })).toEqual({ kind: "reject" });
  });

  it("backs off exponentially with a ceiling", () => {
    expect(retryDelaySeconds(1)).toBe(15);
    expect(retryDelaySeconds(2)).toBe(30);
    expect(retryDelaySeconds(3)).toBe(60);
    expect(retryDelaySeconds(30)).toBe(900);
  });
});

describe("AI transcript replay", () => {
  it("starts by calling the model", () => {
    expect(nextAction([])).toEqual({ type: "call_model" });
    expect(nextSequence([])).toBe(0);
  });

  it("finishes when the model answers without tool calls", () => {
    expect(nextAction([modelStep(0, [], "Done")])).toEqual({ type: "finish", content: "Done" });
  });

  it("resumes the first unresolved tool call, including one interrupted mid-run", () => {
    const interrupted = toolStep(2, "call-2", "running");
    const steps = [
      modelStep(0, [{ id: "call-1", name: "service_list" }, { id: "call-2", name: "service_list" }]),
      toolStep(1, "call-1", "succeeded", [{ name: "Cut" }]),
      interrupted,
    ];
    const action = nextAction(steps);
    expect(action.type).toBe("handle_tool_call");
    if (action.type === "handle_tool_call") {
      expect(action.toolCall.id).toBe("call-2");
      expect(action.existingStep?.id).toBe(interrupted.id);
    }
  });

  it("waits on a tool call that is awaiting approval", () => {
    const steps = [
      modelStep(0, [{ id: "call-1", name: "service_list" }]),
      toolStep(1, "call-1", "awaiting_approval"),
    ];
    const action = nextAction(steps);
    expect(action.type).toBe("handle_tool_call");
  });

  it("calls the model again once every tool call is resolved", () => {
    const steps = [
      modelStep(0, [{ id: "call-1", name: "service_list" }]),
      toolStep(1, "call-1", "rejected"),
    ];
    expect(nextAction(steps)).toEqual({ type: "call_model" });
    expect(countModelSteps(steps)).toBe(1);
    expect(nextSequence(steps)).toBe(2);
  });

  it("rebuilds the exact conversation from persisted steps", () => {
    const steps = [
      toolStep(1, "call-1", "succeeded", { ok: true }),
      modelStep(0, [{ id: "call-1", name: "service_list" }]),
      toolStep(3, "call-2", "failed"),
      modelStep(2, [{ id: "call-2", name: "service_list" }]),
    ];
    const messages = buildConversation({ systemPrompt: "sys", userMessage: "hi", steps });
    expect(messages.map((message) => message.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "assistant",
      "tool",
    ]);
    expect(messages[3]).toEqual({ role: "tool", toolCallId: "call-1", content: JSON.stringify({ ok: true }) });
    expect(messages[5]).toMatchObject({ role: "tool", toolCallId: "call-2" });
    expect(JSON.parse((messages[5] as { content: string }).content)).toHaveProperty("error");
  });
});

describe("AI agent definitions", () => {
  it("only lets agents auto-run low-risk tools by default and caps their loop", () => {
    for (const key of agentKeys()) {
      const agent = getAgent(key)!;
      expect(agent.autoApproveUpTo === "low" || agent.autoApproveUpTo === "none").toBe(true);
      expect(agent.maxModelCalls).toBeGreaterThan(0);
      expect(agent.maxModelCalls).toBeLessThanOrEqual(10);
    }
    expect(getAgent("does-not-exist")).toBeNull();
  });
});
