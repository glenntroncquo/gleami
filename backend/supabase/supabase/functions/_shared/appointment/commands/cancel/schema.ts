import { z } from "zod";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

// Public manage-booking: appointmentId + clientId + companyId, no login.
// Staff platform may send the same body plus a user JWT and optional
// location_id / locationId (selected shop). Location is matched to
// appointment.location_id — it is not a new public RPC.
export const cancelAppointmentSchema = z
  .object({
    appointmentId: z.string().uuid("Invalid appointmentId format"),
    clientId: z.string().uuid("Invalid clientId format"),
    companyId: z.string().uuid("Invalid companyId format"),
    ...optionalLocationIdFields,
  })
  .transform(({ location_id, locationId, ...rest }) => ({
    ...rest,
    locationId: pickLocationId({ location_id, locationId }),
  }));

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
