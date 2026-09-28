import { z } from "zod";

// Marketplace customer self-cancel. Identity comes from the verified user
// JWT, so unlike the staff/public cancel schema this body carries no
// clientId/companyId to match against — only what to cancel and why.
export const cancelCustomerAppointmentSchema = z.object({
  appointmentId: z.string().uuid("Invalid appointmentId format"),
  cancelReason: z.string().trim().max(500, "Cancel reason is too long").optional(),
});

export type CancelCustomerAppointmentInput = z.infer<typeof cancelCustomerAppointmentSchema>;
