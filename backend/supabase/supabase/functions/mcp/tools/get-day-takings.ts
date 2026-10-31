import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import {
  hasShopPermission,
  isShop,
  money,
  queryRows,
  resolveShop,
  runTool,
  shopChoices,
  shopDayBounds,
  todayInTimeZone,
  type UserDb,
} from "../db.ts";

type Payment = {
  amount: number | null;
  amount_gross: number | null;
  payment_method: string | null;
};

export function registerGetDayTakings(server: McpServer, db: UserDb) {
  server.registerTool(
    "get_day_takings",
    {
      title: "Shop takings",
      description: "Money taken at one shop on one day. Use this for today's takings or a named day. Omit date for today in the shop timezone. Omit location_id when they have one shop. Only paid payments are included. This login needs pos:manage or orders:manage.",
      inputSchema: z.object({
        location_id: z.string().uuid().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      const [pos, orders] = await Promise.all([
        hasShopPermission(db, resolved.id, "pos:manage"),
        hasShopPermission(db, resolved.id, "orders:manage"),
      ]);
      if (!pos && !orders) return "This login cannot see takings.";
      const date = args.date ?? todayInTimeZone(resolved.timezone);
      const bounds = shopDayBounds(date, resolved.timezone);
      const payments = await queryRows<Payment[]>(
        db.from("payment").select("amount, amount_gross, payment_method")
          .eq("location_id", resolved.id)
          .in("payment_status", ["paid", "completed"])
          .gte("paid_at", bounds.start)
          .lt("paid_at", bounds.end)
          .limit(500),
      );
      const byMethod = new Map<string, number>();
      let total = 0;
      for (const payment of payments) {
        const amount = Number(payment.amount_gross ?? payment.amount ?? 0);
        const method = payment.payment_method || "Other";
        byMethod.set(method, (byMethod.get(method) ?? 0) + amount);
        total += amount;
      }
      const lines = [`${resolved.name} · ${resolved.timezone} · ${date}`, `Total ${money(total)}`];
      for (const [method, amount] of byMethod) lines.push(`${method} ${money(amount)}`);
      if (payments.length === 0) lines.push("No paid payments.");
      if (payments.length === 500) lines.push("More payments exist than this answer includes.");
      return lines.join("\n");
    }),
  );
}
