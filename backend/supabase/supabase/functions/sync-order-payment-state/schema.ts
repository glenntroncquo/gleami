import { z } from "zod";

export const syncOrderPaymentStateSchema = z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  order_id: z.string().uuid("Invalid order_id format"),
});

export type SyncOrderPaymentStateInput = z.infer<typeof syncOrderPaymentStateSchema>;

