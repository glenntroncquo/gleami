import type { ConversationMessage } from "../transcript.ts";
import { ModelProviderError, type ModelProvider, type ModelResponse, type ModelToolSpec } from "./types.ts";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 60_000;

function toWireMessage(message: ConversationMessage): Record<string, unknown> {
  switch (message.role) {
    case "assistant":
      return {
        role: "assistant",
        content: message.content,
        ...(message.toolCalls.length > 0 && {
          tool_calls: message.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: { name: call.name, arguments: call.arguments },
          })),
        }),
      };
    case "tool":
      return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
    default:
      return { role: message.role, content: message.content };
  }
}

/**
 * Chat Completions adapter. Works with OpenAI and any compatible endpoint
 * (AI_BASE_URL), so switching provider is a configuration change.
 */
export function createOpenAiCompatibleProvider(): ModelProvider {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const baseUrl = (Deno.env.get("AI_BASE_URL") || DEFAULT_BASE_URL).replace(/\/$/, "");
  const model = Deno.env.get("AI_MODEL") || DEFAULT_MODEL;

  return {
    async complete({ messages, tools }: { messages: ConversationMessage[]; tools: ModelToolSpec[] }): Promise<ModelResponse> {
      if (!apiKey) {
        throw new ModelProviderError("OPENAI_API_KEY is not configured", false);
      }

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: messages.map(toWireMessage),
            ...(tools.length > 0 && {
              tools: tools.map((tool) => ({
                type: "function",
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              })),
            }),
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        throw new ModelProviderError(`Model request failed: ${(error as Error).message}`, true);
      }

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        throw new ModelProviderError(`Model provider returned ${response.status}: ${detail}`, retryable);
      }

      const body = await response.json();
      const message = body?.choices?.[0]?.message;
      if (!message) {
        throw new ModelProviderError("Model provider returned no message", true);
      }

      return {
        content: typeof message.content === "string" ? message.content : null,
        toolCalls: (message.tool_calls ?? [])
          .filter((call: any) => call?.type === "function")
          .map((call: any) => ({
            id: String(call.id),
            name: String(call.function?.name ?? ""),
            arguments: String(call.function?.arguments ?? "{}"),
          })),
        model: String(body.model ?? model),
        inputTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
      };
    },
  };
}
