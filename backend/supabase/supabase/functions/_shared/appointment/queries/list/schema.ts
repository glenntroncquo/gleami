import { z } from "zod";

export const listAppointmentsByClientSchema = z
  .object({
    client_id: z.string().uuid("Invalid client_id format"),
    company_id: z.string().uuid("Invalid company_id format"),
  })
  .transform((data) => ({
    clientId: data.client_id,
    companyId: data.company_id,
  }));

export type ListAppointmentsByClientInput = z.infer<typeof listAppointmentsByClientSchema>;
