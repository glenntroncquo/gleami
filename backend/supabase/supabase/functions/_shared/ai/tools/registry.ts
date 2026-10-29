import type { ToolDefinition } from "./types.ts";
import { serviceListTool } from "./service-list.ts";
import { availabilitySearchTool } from "./availability-search.ts";
import { clientSearchTool } from "./client-search.ts";
import { orderListUnpaidTool } from "./order-list-unpaid.ts";

/**
 * The single list of capabilities AI surfaces may request. Agents pick a
 * subset by name; the MCP adapter, voice and inbox agents will reuse the
 * same entries rather than defining their own.
 */
const TOOLS: ToolDefinition[] = [
  serviceListTool,
  availabilitySearchTool,
  clientSearchTool,
  orderListUnpaidTool,
];

const TOOLS_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

export function getTool(name: string): ToolDefinition | null {
  return TOOLS_BY_NAME.get(name) ?? null;
}

export function toolsForAgent(toolNames: string[]): ToolDefinition[] {
  return toolNames.map((name) => {
    const tool = TOOLS_BY_NAME.get(name);
    if (!tool) {
      throw new Error(`Agent references unknown tool ${name}`);
    }
    return tool;
  });
}
