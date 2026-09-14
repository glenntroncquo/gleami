import { z } from "zod";

const rawBodySchema = z.any().transform((raw) => ({
  company_id: raw?.company_id ?? raw?.companyId,
  reader_id: raw?.reader_id ?? raw?.readerId,
  payment_intent_id: raw?.payment_intent_id ?? raw?.paymentIntentId,
}));

export const processPaymentTerminalSchema = rawBodySchema.pipe(z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  reader_id: z.string().min(1, "Reader ID is required"),
  payment_intent_id: z.string().min(1, "Payment intent ID is required"),
}));

export type ProcessPaymentTerminalInput = z.infer<typeof processPaymentTerminalSchema>;
