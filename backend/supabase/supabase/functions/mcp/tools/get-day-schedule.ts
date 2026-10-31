import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { runTool, type UserDb } from "../db.ts";

type Visit = {
  id: string;
  start: string;
  end: string;
  client_name: string;
  client_id: string | null;
  is_canceled: boolean;
  services: Array<{ name: string | null; variant: string | null; staff_name: string | null; staff_id: string | null }>;
};

type Schedule = {
  error?: string;
  needs_location?: boolean;
  locations?: Array<{ id: string; name: string; timezone: string }>;
  location_name?: string;
  timezone?: string;
  date?: string;
  truncated?: boolean;
  visits?: Visit[];
};

export function registerGetDaySchedule(server: McpServer, db: UserDb) {
  server.registerTool(
    "get_day_schedule",
    {
      title: "Shop schedule",
      description: "Use this when the owner asks what is on today, the schedule, who is coming, or the next client. Omit date for today in the shop timezone. Omit location_id when they have one shop. Times are the shop wall clock, not UTC.",
      inputSchema: z.object({
        location_id: z.string().uuid().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        staff_id: z.string().uuid().optional(),
        include_canceled: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const { data, error } = await db.rpc("staff_day_schedule", {
        p_location_id: args.location_id ?? null,
        p_date: args.date ?? null,
        p_staff_id: args.staff_id ?? null,
        p_include_canceled: args.include_canceled ?? false,
      });
      if (error) throw new Error(error.message);
      const schedule = (data ?? {}) as Schedule;
      if (schedule.error === "NO_LOCATIONS") return "This login cannot open a shop.";
      if (schedule.error === "FORBIDDEN") return "That shop is not one this login can open.";
      if (schedule.error === "UNAUTHENTICATED") return "Sign in required.";
      if (schedule.error) throw new Error(schedule.error);
      if (schedule.needs_location) {
        const lines = (schedule.locations ?? []).map((shop) => `- ${shop.name} (${shop.timezone})\n  id: ${shop.id}`);
        return `This login can open more than one shop. Ask which shop.\n${lines.join("\n")}`;
      }
      const visits = schedule.visits ?? [];
      const header = `${schedule.location_name} · ${schedule.timezone} · ${schedule.date}`;
      if (visits.length === 0) return `${header}\nNo visits.`;
      const lines = visits.map((visit) => {
        const services = visit.services.map((service) => {
          const label = [service.name, service.variant].filter(Boolean).join(" ");
          return `${label || "Service"} · ${service.staff_name || "Unassigned"}`;
        }).join("; ");
        const canceled = visit.is_canceled ? " · canceled" : "";
        return `${visit.start}–${visit.end} · ${visit.client_name} · ${services}${canceled}\nid: ${visit.id}`;
      });
      const more = schedule.truncated ? "\nMore than 100 visits. Ask for a staff member to narrow the day." : "";
      return `${header}\n${lines.join("\n")}${more}`;
    }),
  );
}
