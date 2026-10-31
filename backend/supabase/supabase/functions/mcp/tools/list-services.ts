import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { isShop, queryRows, resolveShop, runTool, shopChoices, type UserDb } from "../db.ts";

type Variant = {
  id: string;
  name: string;
  price: number;
  client_duration_minutes: number;
  is_active: boolean | null;
  is_deleted: boolean | null;
};

type ServiceRow = {
  service: {
    id: string;
    name: string;
    is_active: boolean | null;
    is_deleted: boolean | null;
    service_variant: Variant[] | null;
  } | null;
};

export function registerListServices(server: McpServer, db: UserDb) {
  server.registerTool(
    "list_services",
    {
      title: "Services and prices",
      description: "Use this when the owner asks what a service costs or how long it takes at a shop. Prices are the shop's variant prices.",
      inputSchema: z.object({ location_id: z.string().uuid().optional() }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      const rows = await queryRows<ServiceRow[]>(
        db.from("location_service").select(`
          service:service_id (
            id, name, is_active, is_deleted,
            service_variant ( id, name, price, client_duration_minutes, is_active, is_deleted )
          )
        `).eq("location_id", resolved.id),
      );
      const lines = [`${resolved.name}`];
      for (const row of rows) {
        const service = row.service;
        if (!service || service.is_deleted || service.is_active === false) continue;
        const variants = (service.service_variant ?? []).filter((variant) => !variant.is_deleted && variant.is_active !== false);
        if (variants.length === 0) continue;
        lines.push(service.name);
        for (const variant of variants) {
          lines.push(`- ${variant.name} · ${variant.price} · ${variant.client_duration_minutes} min`);
          lines.push(`  variant_id: ${variant.id}`);
        }
      }
      if (lines.length === 1) lines.push("No active services at this shop.");
      return lines.join("\n");
    }),
  );
}
