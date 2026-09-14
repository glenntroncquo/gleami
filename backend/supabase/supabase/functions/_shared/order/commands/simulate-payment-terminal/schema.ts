import { z } from "zod";

const rawBodySchema = z.any().transform((raw) => ({
  company_id: raw?.company_id ?? raw?.companyId,
  reader_id: raw?.reader_id ?? raw?.readerId,
  card_number: raw?.card_number ?? raw?.cardNumber,
}));

export const simulatePaymentTerminalSchema = rawBodySchema.pipe(z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  reader_id: z.string().min(1, "Reader ID is required"),
  card_number: z.string().min(1, "Card number is required"),
}));

export type SimulatePaymentTerminalInput = z.infer<typeof simulatePaymentTerminalSchema>;
