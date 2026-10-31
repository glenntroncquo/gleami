import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import {
  callUserFunction,
  hasShopPermission,
  isShop,
  personName,
  queryOne,
  resolveShop,
  runTool,
  shopChoices,
  type UserDb,
} from "../db.ts";

type Variant = { id: string; service_id: string; name: string; company_id: string };
type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export function registerCreateAppointment(server: McpServer, db: UserDb, token: string) {
  server.registerTool(
    "create_appointment",
    {
      title: "Book a visit",
      description: "Book one visit in a shop the user can manage. Ask them to confirm the client, service, staff member, date, and time before calling. Pass variant_id from list_services and staff_id from list_staff. Pass client_id from search_clients, or first_name for a new client, or walk_in true. Date and time are the shop wall clock. Omit location_id when they have one shop.",
      inputSchema: z.object({
        variant_id: z.string().uuid(),
        staff_id: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        location_id: z.string().uuid().optional(),
        client_id: z.string().uuid().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        walk_in: z.boolean().optional(),
        staff_notes: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args) => runTool(async () => {
      const resolved = await resolveShop(db, args.location_id);
      if (!isShop(resolved)) return shopChoices(resolved.choices);
      if (!await hasShopPermission(db, resolved.id, "calendar:manage")) {
        return "This login cannot change the calendar.";
      }
      const variant = await queryOne<Variant>(
        db.from("service_variant").select("id, service_id, name, company_id").eq("id", args.variant_id).maybeSingle(),
      );
      if (!variant || variant.company_id !== resolved.companyId) {
        return "That service variant is not at this shop.";
      }
      let client: ClientRow | null = null;
      if (args.client_id) {
        client = await queryOne<ClientRow>(
          db.from("client").select("id, first_name, last_name, email, phone").eq("id", args.client_id).maybeSingle(),
        );
        if (!client) return "No client with that id is visible to this login.";
      } else if (!args.walk_in && !args.first_name?.trim()) {
        return "Say which client, or say it is a walk-in.";
      }
      const payload = await callUserFunction("appointment-create-staff", token, {
        start: `${args.date}T${args.time}:00`,
        staffId: args.staff_id,
        companyId: resolved.companyId,
        locationId: resolved.id,
        services: [{
          serviceId: variant.service_id,
          serviceVariantId: variant.id,
          staffId: args.staff_id,
        }],
        email: client?.email ?? args.email ?? "",
        firstName: client?.first_name ?? args.first_name,
        lastName: client?.last_name ?? args.last_name,
        phone: client?.phone ?? args.phone,
        staff_notes: args.staff_notes,
      });
      const bookingId = payload.booking_id;
      const clientId = payload.client_id;
      const who = client ? personName(client.first_name, client.last_name) : (args.walk_in ? "Walk-in" : personName(args.first_name, args.last_name));
      return [
        `Booked ${who} · ${variant.name}`,
        `${resolved.name} · ${args.date} ${args.time}`,
        `id: ${typeof bookingId === "string" ? bookingId : ""}`,
        `client_id: ${typeof clientId === "string" ? clientId : client?.id ?? ""}`,
      ].filter((line) => !line.endsWith(": ")).join("\n");
    }),
  );
}
