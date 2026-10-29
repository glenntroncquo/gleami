import type { ToolCall } from "../entity.ts";
import type { ConversationMessage } from "../transcript.ts";

export interface ModelToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ModelResponse {
  content: string | null;
  toolCalls: ToolCall[];
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface ModelProvider {
  complete(params: { messages: ConversationMessage[]; tools: ModelToolSpec[] }): Promise<ModelResponse>;
}

export class ModelProviderError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "ModelProviderError";
  }
}
