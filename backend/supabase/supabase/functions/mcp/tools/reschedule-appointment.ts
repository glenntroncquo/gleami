import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { runTool, type UserDb } from "../db.ts";

type Moved = {
  error?: string;
  id?: string;
  date?: string;
  start?: string;
  end?: string;
};

export function registerRescheduleAppointment(server: McpServer, db: UserDb) {
  server.registerTool(
    "reschedule_appointment",
    {
      title: "Move a visit",
      description: "Move one visit to a new shop wall-clock start. Ask the user to confirm the visit id and the new date and time before calling. The visit, every service, and every phase move together. Pass the visit id from get_day_schedule.",
      inputSchema: z.object({
        appointment_id: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args) => runTool(async () => {
      const { data, error } = await db.rpc("staff_reschedule_appointment", {
        p_appointment_id: args.appointment_id,
        p_start: `${args.date} ${args.time}:00`,
      });
      if (error) throw new Error(error.message);
      const moved = (data ?? {}) as Moved;
      if (moved.error === "NOT_FOUND") return "No visit with that id is visible to this login.";
      if (moved.error === "FORBIDDEN") return "This login cannot move that visit.";
      if (moved.error === "CANCELED") return "That visit is canceled.";
      if (moved.error === "SLOT_TAKEN") return "That time is already taken.";
      if (moved.error === "UNAUTHENTICATED") return "Sign in required.";
      if (moved.error) throw new Error(moved.error);
      return `Moved\n${moved.date} ${moved.start}–${moved.end}\nid: ${moved.id}`;
    }),
  );
}
