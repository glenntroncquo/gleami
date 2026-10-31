import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import type { UserDb } from "../db.ts";
import { registerFindOpenSlots } from "./find-open-slots.ts";
import { registerGetAppointment } from "./get-appointment.ts";
import { registerGetClient } from "./get-client.ts";
import { registerGetDaySchedule } from "./get-day-schedule.ts";
import { registerGetWorkingHours } from "./get-working-hours.ts";
import { registerListServices } from "./list-services.ts";
import { registerListStaff } from "./list-staff.ts";
import { registerSearchClients } from "./search-clients.ts";
import { registerWhoami } from "./whoami.ts";

export function registerReadTools(server: McpServer, db: UserDb) {
  registerWhoami(server, db);
  registerGetDaySchedule(server, db);
  registerGetAppointment(server, db);
  registerSearchClients(server, db);
  registerGetClient(server, db);
  registerListStaff(server, db);
  registerGetWorkingHours(server, db);
  registerListServices(server, db);
  registerFindOpenSlots(server, db);
}
