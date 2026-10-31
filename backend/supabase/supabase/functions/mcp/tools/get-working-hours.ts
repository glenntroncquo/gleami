import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import {
  isShop,
  personName,
  queryRows,
  resolveShop,
  runTool,
  shopChoices,
  shopDayBounds,
  todayInTimeZone,
  weekdayIndex,
  type UserDb,
} from "../db.ts";

type Rule = {
  staff_id: string;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_to: string | null;
  staff: { first_name: string | null; last_name: string | null } | null;
};

type Exception = {
  staff_id: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  staff: { first_name: string | null; last_name: string | null } | null;
};

export function registerGetWorkingHours(server: McpServer, db: UserDb) {
  server.registerTool(
    "get_working_hours",
    {
      title: "Who is scheduled to work",
      description: "Use this when the owner asks who is working or on the rota. This is staff hours, not booked visits. Booked visits are get_day_schedule.",
      inputSchema: z.object({
        location_id: z.string().uuid().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      const date = args.date ?? todayInTimeZone(resolved.timezone);
      const dow = weekdayIndex(date);
      const rules = await queryRows<Rule[]>(
        db.from("staff_schedule_rule").select("staff_id, start_time, end_time, effective_from, effective_to, staff:staff_id(first_name, last_name)")
          .eq("location_id", resolved.id)
          .eq("is_active", true)
          .eq("day_of_week", dow),
      );
      const active = rules.filter((rule) => {
        if (rule.effective_from && rule.effective_from > date) return false;
        if (rule.effective_to && rule.effective_to < date) return false;
        return true;
      });
      const bounds = shopDayBounds(date, resolved.timezone);
      const exceptions = await queryRows<Exception[]>(
        db.from("staff_schedule_exception").select("staff_id, kind, starts_at, ends_at, staff:staff_id(first_name, last_name)")
          .eq("location_id", resolved.id)
          .lt("starts_at", bounds.end)
          .gte("ends_at", bounds.start),
      );
      const lines = [`${resolved.name} · ${resolved.timezone} · ${date}`];
      if (active.length === 0) lines.push("No weekly hours for this weekday.");
      for (const rule of active) {
        lines.push(`${personName(rule.staff?.first_name, rule.staff?.last_name)} · ${rule.start_time.slice(0, 5)}–${rule.end_time.slice(0, 5)}`);
        lines.push(`staff_id: ${rule.staff_id}`);
      }
      for (const exception of exceptions) {
        const label = exception.kind === "unavailable" ? "away" : "extra hours";
        lines.push(`${personName(exception.staff?.first_name, exception.staff?.last_name)} · ${label} · ${exception.starts_at}–${exception.ends_at}`);
      }
      return lines.join("\n");
    }),
  );
}
