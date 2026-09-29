import { z } from "zod";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

// Two caller shapes:
// - Guest manage-booking link: appointmentId + token (random capability
//   minted per notification email, SHA-256 hashed at rest). Replaces the old
//   unauthenticated clientId + companyId triple, which let anyone cancel and
//   enumerate appointments.
// - Staff platform: appointmentId + clientId + companyId + user JWT, optional
//   location_id / locationId (selected shop). Location is matched to
//   appointment.location_id — it is not a new public RPC.
export const cancelAppointmentSchema = z
  .object({
    appointmentId: z.string().uuid("Invalid appointmentId format"),
    clientId: z.string().uuid("Invalid clientId format").optional(),
    companyId: z.string().uuid("Invalid companyId format").optional(),
    token: z.string().min(1).max(128).optional(),
    ...optionalLocationIdFields,
  })
  .transform(({ location_id, locationId, ...rest }) => ({
    ...rest,
    locationId: pickLocationId({ location_id, locationId }),
  }));

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
