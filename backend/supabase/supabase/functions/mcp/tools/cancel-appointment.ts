import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { callUserFunction, hasShopPermission, loadShops, queryOne, runTool, type UserDb } from "../db.ts";

type Visit = {
  id: string;
  client_id: string | null;
  location_id: string;
  is_canceled: boolean;
};

export function registerCancelAppointment(server: McpServer, db: UserDb, token: string) {
  server.registerTool(
    "cancel_appointment",
    {
      title: "Cancel a visit",
      description: "Cancel one visit. Ask the user to confirm the visit before calling. Pass the visit id from get_day_schedule. This does not book a replacement.",
      inputSchema: z.object({ appointment_id: z.string().uuid() }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args) => runTool(async () => {
      const visit = await queryOne<Visit>(
        db.from("appointment").select("id, client_id, location_id, is_canceled").eq("id", args.appointment_id).maybeSingle(),
      );
      if (!visit) return "No visit with that id is visible to this login.";
      if (visit.is_canceled) return "That visit is already canceled.";
      if (!visit.client_id) return "That visit has no client, so it cannot be canceled from here.";
      if (!await hasShopPermission(db, visit.location_id, "calendar:manage")) {
        return "This login cannot change the calendar.";
      }
      const shops = await loadShops(db);
      const shop = shops.find((item) => item.id === visit.location_id);
      if (!shop) return "That shop is not one this login can open.";
      await callUserFunction("appointment-cancel", token, {
        appointmentId: visit.id,
        clientId: visit.client_id,
        companyId: shop.companyId,
        locationId: visit.location_id,
      });
      return `Canceled\nid: ${visit.id}`;
    }),
  );
}
