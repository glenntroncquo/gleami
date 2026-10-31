import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import type { UserDb } from "../db.ts";
import { registerCancelAppointment } from "./cancel-appointment.ts";
import { registerCreateAppointment } from "./create-appointment.ts";
import { registerFindOpenSlots } from "./find-open-slots.ts";
import { registerGetAppointment } from "./get-appointment.ts";
import { registerGetClient } from "./get-client.ts";
import { registerGetDaySchedule } from "./get-day-schedule.ts";
import { registerGetDayTakings } from "./get-day-takings.ts";
import { registerGetWorkingHours } from "./get-working-hours.ts";
import { registerListClientAppointments } from "./list-client-appointments.ts";
import { registerListServices } from "./list-services.ts";
import { registerListStaff } from "./list-staff.ts";
import { registerRescheduleAppointment } from "./reschedule-appointment.ts";
import { registerSearchClients } from "./search-clients.ts";
import { registerSetStaffNote } from "./set-staff-note.ts";
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
  registerListClientAppointments(server, db);
  registerGetDayTakings(server, db);
}

export function registerWriteTools(server: McpServer, db: UserDb, token: string) {
  registerCreateAppointment(server, db, token);
  registerRescheduleAppointment(server, db);
  registerCancelAppointment(server, db, token);
  registerSetStaffNote(server, db);
}
