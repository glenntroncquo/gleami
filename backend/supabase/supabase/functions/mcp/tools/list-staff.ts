import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { isShop, personName, queryRows, resolveShop, runTool, shopChoices, type UserDb } from "../db.ts";

type StaffRow = { id: string; first_name: string | null; last_name: string | null };

export function registerListStaff(server: McpServer, db: UserDb) {
  server.registerTool(
    "list_staff",
    {
      title: "Staff at a shop",
      description: "Who works at a shop. Call this before a schedule question that names a person, such as Shelsey, and pass the matching staff id to get_day_schedule. If nobody matches or several people match, ask which person. This is the staff directory, not the booked day and not the rota.",
      inputSchema: z.object({ location_id: z.string().uuid().optional() }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      const members = await queryRows<Array<{ staff_id: string | null }>>(
        db.from("location_membership").select("staff_id").eq("location_id", resolved.id).eq("is_active", true),
      );
      const offers = await queryRows<Array<{ staff_id: string }>>(
        db.from("staff_service").select("staff_id").eq("location_id", resolved.id),
      );
      const ids = [...new Set([
        ...members.map((row) => row.staff_id).filter((id): id is string => Boolean(id)),
        ...offers.map((row) => row.staff_id),
      ])];
      if (ids.length === 0) return `${resolved.name}\nNo staff are listed at this shop.`;
      const staff = await queryRows<StaffRow[]>(
        db.from("staff").select("id, first_name, last_name").in("id", ids).order("first_name"),
      );
      const lines = staff.map((person) => `${personName(person.first_name, person.last_name)}\nid: ${person.id}`);
      return `${resolved.name}\n${lines.join("\n")}`;
    }),
  );
}
