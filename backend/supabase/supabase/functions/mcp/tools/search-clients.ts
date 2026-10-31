import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { isShop, personName, queryRows, resolveShop, runTool, type UserDb } from "../db.ts";

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export function registerSearchClients(server: McpServer, db: UserDb) {
  server.registerTool(
    "search_clients",
    {
      title: "Find a client",
      description: "Use this to find a client by name, email, or phone in the shops this login can open. At least 2 characters. Do not use this for the day's schedule.",
      inputSchema: z.object({
        query: z.string().trim().min(2).max(80),
        location_id: z.string().uuid().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      const shops = isShop(resolved) ? [resolved] : resolved.choices;
      if (shops.length === 0) return "This login cannot open a shop.";
      const locationIds = shops.map((shop) => shop.id);
      const safe = args.query.replace(/[%_,]/g, " ").trim();
      const pattern = `%${safe}%`;
      const rows = await queryRows<ClientRow[]>(
        db.from("client").select("id, first_name, last_name, email, phone, client_location!inner(location_id)")
          .in("client_location.location_id", locationIds)
          .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
          .limit(20),
      );
      if (rows.length === 0) return `No client matches "${args.query}".`;
      return rows.map((client) => {
        const contact = [client.email, client.phone].filter(Boolean).join(" · ");
        return `${personName(client.first_name, client.last_name)}${contact ? ` · ${contact}` : ""}\nid: ${client.id}`;
      }).join("\n");
    }),
  );
}
