import { z } from "zod";
import { searchClientsHandler } from "../../client/queries/search/handler.ts";
import type { ToolDefinition } from "./types.ts";

const MAX_RESULTS = 10;

const inputSchema = z
  .object({
    search_term: z.string().trim().min(2).max(100),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const clientSearchTool: ToolDefinition<Input> = {
  name: "client_search",
  description: `Search the salon's clients by name or email. Returns at most ${MAX_RESULTS} matches.`,
  parameters: {
    type: "object",
    properties: {
      search_term: { type: "string", description: "Part of a name or email, at least 2 characters." },
    },
    required: ["search_term"],
    additionalProperties: false,
  },
  inputSchema,
  risk: "low",
  permission: "clients:read",
  idempotent: true,
  requestedLocationId: () => undefined,
  async execute(context, input) {
    const clients = await searchClientsHandler({
      searchTerm: input.search_term,
      companyId: context.companyId,
    });

    return clients.slice(0, MAX_RESULTS).map((client) => ({
      client_id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
    }));
  },
};
