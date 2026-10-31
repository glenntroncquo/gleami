import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { loadShops, personName, queryOne, queryRows, runTool, todayInTimeZone, wallClock, type UserDb } from "../db.ts";

type ClientRow = { id: string; first_name: string | null; last_name: string | null };
type Segment = {
  sequence: number;
  service: { name: string | null } | null;
  staff: { first_name: string | null; last_name: string | null } | null;
};
type Visit = {
  id: string;
  start: string;
  end: string;
  location_id: string;
  appointment_segment: Segment[] | null;
};

export function registerListClientAppointments(server: McpServer, db: UserDb) {
  server.registerTool(
    "list_client_appointments",
    {
      title: "A client's upcoming visits",
      description: "Upcoming visits for one client, soonest first, across shops this login can open. Use this after search_clients. Pass client_id. This is the coming calendar, not past visits. Times are the shop wall clock.",
      inputSchema: z.object({ client_id: z.string().uuid() }),
      annotations: { readOnlyHint: true },
    },
    (args) => runTool(async () => {
      const client = await queryOne<ClientRow>(
        db.from("client").select("id, first_name, last_name").eq("id", args.client_id).maybeSingle(),
      );
      if (!client) return "No client with that id is visible to this login.";
      const shops = await loadShops(db);
      const today = shops.reduce((earliest, shop) => {
        const day = todayInTimeZone(shop.timezone);
        return day < earliest ? day : earliest;
      }, shops[0] ? todayInTimeZone(shops[0].timezone) : todayInTimeZone("Europe/Brussels"));
      const visits = await queryRows<Visit[]>(
        db.from("appointment").select(`
          id, start, end, location_id,
          appointment_segment (
            sequence,
            service:service_id ( name ),
            staff:staff_id ( first_name, last_name )
          )
        `)
          .eq("client_id", client.id)
          .eq("is_canceled", false)
          .gte("start", `${today}T00:00:00`)
          .order("start", { ascending: true })
          .limit(20),
      );
      const lines = [personName(client.first_name, client.last_name), `id: ${client.id}`];
      if (visits.length === 0) {
        lines.push("No upcoming visits.");
        return lines.join("\n");
      }
      lines.push("Upcoming:");
      for (const visit of visits) {
        const start = wallClock(visit.start);
        const end = wallClock(visit.end);
        const shop = shops.find((item) => item.id === visit.location_id);
        const services = [...(visit.appointment_segment ?? [])]
          .sort((a, b) => a.sequence - b.sequence)
          .map((service) => `${service.service?.name || "Service"} · ${personName(service.staff?.first_name, service.staff?.last_name)}`)
          .join("; ");
        lines.push(`${start.date} ${start.time}–${end.time} · ${shop?.name ?? "Shop"} · ${services}`);
        lines.push(`id: ${visit.id}`);
      }
      if (visits.length === 20) lines.push("More upcoming visits exist.");
      return lines.join("\n");
    }),
  );
}
