import type { AgentStep, ModelStepOutput, ToolCall } from "./entity.ts";

/**
 * Provider-neutral conversation. The model provider adapter maps it to its
 * own wire format; the runtime only ever rebuilds it from persisted steps, so
 * a resumed run sees exactly what the crashed attempt saw.
 */
export type ConversationMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls: ToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type NextAction =
  | { type: "call_model" }
  | { type: "handle_tool_call"; toolCall: ToolCall; existingStep: AgentStep | null }
  | { type: "finish"; content: string };

const RESOLVED_TOOL_STATUSES = new Set(["succeeded", "failed", "rejected"]);

function bySequence(steps: AgentStep[]): AgentStep[] {
  return [...steps].sort((a, b) => a.sequence - b.sequence);
}

export function modelOutputOf(step: AgentStep): ModelStepOutput {
  const output = (step.output ?? {}) as Partial<ModelStepOutput>;
  return {
    content: typeof output.content === "string" ? output.content : null,
    toolCalls: Array.isArray(output.toolCalls) ? output.toolCalls : [],
  };
}

export function nextSequence(steps: AgentStep[]): number {
  return steps.reduce((max, step) => Math.max(max, step.sequence + 1), 0);
}

export function countModelSteps(steps: AgentStep[]): number {
  return steps.filter((step) => step.kind === "model").length;
}

export function nextAction(steps: AgentStep[]): NextAction {
  const ordered = bySequence(steps);
  const lastModelStep = [...ordered].reverse().find((step) => step.kind === "model");
  if (!lastModelStep) {
    return { type: "call_model" };
  }

  const { content, toolCalls } = modelOutputOf(lastModelStep);
  if (toolCalls.length === 0) {
    return { type: "finish", content: content ?? "" };
  }

  for (const toolCall of toolCalls) {
    const existingStep = ordered.find(
      (step) => step.kind === "tool" && step.toolCallId === toolCall.id,
    ) ?? null;
    if (!existingStep || !RESOLVED_TOOL_STATUSES.has(existingStep.status)) {
      return { type: "handle_tool_call", toolCall, existingStep };
    }
  }

  return { type: "call_model" };
}

export function toolResultContent(step: AgentStep): string {
  switch (step.status) {
    case "succeeded":
      return JSON.stringify(step.output ?? null);
    case "rejected":
      return JSON.stringify({
        error: "A salon user rejected this action. Do not retry it; tell the user it was not done.",
      });
    default:
      return JSON.stringify({ error: step.error ?? "Tool call failed" });
  }
}

export function buildConversation(params: {
  systemPrompt: string;
  userMessage: string;
  steps: AgentStep[];
}): ConversationMessage[] {
  const ordered = bySequence(params.steps);
  const messages: ConversationMessage[] = [
    { role: "system", content: params.systemPrompt },
    { role: "user", content: params.userMessage },
  ];

  for (const step of ordered) {
    if (step.kind !== "model") continue;
    const { content, toolCalls } = modelOutputOf(step);
    messages.push({ role: "assistant", content, toolCalls });

    for (const toolCall of toolCalls) {
      const toolStep = ordered.find(
        (candidate) => candidate.kind === "tool" && candidate.toolCallId === toolCall.id,
      );
      if (toolStep && RESOLVED_TOOL_STATUSES.has(toolStep.status)) {
        messages.push({
          role: "tool",
          toolCallId: toolCall.id,
          content: toolResultContent(toolStep),
        });
      }
    }
  }

  return messages;
}
