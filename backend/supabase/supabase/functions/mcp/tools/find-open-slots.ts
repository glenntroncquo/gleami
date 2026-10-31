import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { addDays, isShop, queryOne, resolveShop, runTool, shopChoices, todayInTimeZone, type UserDb } from "../db.ts";

type Variant = { id: string; service_id: string; name: string; company_id: string };

type Slot = { start_time: string; end_time: string; first_name: string | null; last_name: string | null };
type Availability = {
  dates?: Record<string, { staff?: Record<string, { slots?: Slot[] }> }>;
};

export function registerFindOpenSlots(server: McpServer, db: UserDb) {
  server.registerTool(
    "find_open_slots",
    {
      title: "Open appointment times",
      description: "Use this when the owner asks when a service is free. Pass a variant_id from list_services. This is empty time, not the booked schedule. The range is at most 7 days.",
      inputSchema: z.object({
        variant_id: z.string().uuid(),
        location_id: z.string().uuid().optional(),
        staff_id: z.string().uuid().optional(),
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      const variant = await queryOne<Variant>(
        db.from("service_variant").select("id, service_id, name, company_id").eq("id", args.variant_id).maybeSingle(),
      );
      if (!variant || variant.company_id !== resolved.companyId) {
        return "That service variant is not at this shop.";
      }
      const startDate = args.start_date ?? todayInTimeZone(resolved.timezone);
      const requestedEnd = args.end_date ?? startDate;
      const endDate = requestedEnd > addDays(startDate, 6) ? addDays(startDate, 6) : requestedEnd;
      const anon = Deno.env.get("SUPABASE_ANON_KEY");
      const base = Deno.env.get("SUPABASE_URL");
      if (!anon || !base) throw new Error("Availability is not configured.");
      const response = await fetch(`${base}/functions/v1/availability-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({
          companyId: resolved.companyId,
          locationId: resolved.id,
          services: [{ serviceId: variant.service_id, serviceVariantId: variant.id, staffId: args.staff_id }],
          startDate,
          endDate,
          staffIds: args.staff_id ? [args.staff_id] : undefined,
        }),
      });
      const payload = await response.json().catch(() => null) as Availability & { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Could not load open times.");
      const lines = [`${resolved.name} · ${variant.name} · ${startDate} to ${endDate}`];
      let count = 0;
      for (const [date, day] of Object.entries(payload?.dates ?? {})) {
        for (const group of Object.values(day.staff ?? {})) {
          for (const slot of group.slots ?? []) {
            if (count >= 30) {
              lines.push("More open times exist. Narrow the dates or the staff member.");
              return lines.join("\n");
            }
            const staff = [slot.first_name, slot.last_name].filter(Boolean).join(" ") || "Staff";
            lines.push(`${date} ${slot.start_time}–${slot.end_time} · ${staff}`);
            count += 1;
          }
        }
      }
      if (count === 0) lines.push("No open times in that range.");
      return lines.join("\n");
    }),
  );
}
