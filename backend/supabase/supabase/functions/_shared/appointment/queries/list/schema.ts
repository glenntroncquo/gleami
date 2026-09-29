import { z } from "zod";

// Two caller shapes:
// - Guest manage-booking link: appointment_id + token → exactly one
//   appointment, token verified in the handler.
// - Staff platform: client_id + company_id + user JWT (membership checked in
//   the function entrypoint). The public (companyId, clientId) listing is
//   gone — it enumerated every upcoming appointment of any client.
export const listAppointmentsSchema = z
  .object({
    client_id: z.string().uuid("Invalid client_id format").optional(),
    company_id: z.string().uuid("Invalid company_id format").optional(),
    appointment_id: z.string().uuid("Invalid appointment_id format").optional(),
    token: z.string().min(1).max(128).optional(),
  })
  .transform((data) => ({
    clientId: data.client_id,
    companyId: data.company_id,
    appointmentId: data.appointment_id,
    token: data.token,
  }))
  .refine(
    (value) =>
      value.token ? Boolean(value.appointmentId) : Boolean(value.clientId && value.companyId),
    { message: "Provide either appointment_id + token, or client_id + company_id" },
  );

export type ListAppointmentsInput = z.infer<typeof listAppointmentsSchema>;
