import { z } from "zod";

export const scradaConfigSchema = z.object({
  cashbook_id: z.string().uuid("Invalid cashbook_id in config"),
  transaction_type_id: z.string().uuid("Invalid transaction_type_id in config"),
  language: z.enum(["NL", "FR", "EN"]).optional(),
});

export const scradaAddCashbookLinesSchema = z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  payment_ids: z
    .array(z.string().uuid("Invalid payment_id format"))
    .min(1, "At least one payment_id is required"),
});

export type ScradaConfig = z.infer<typeof scradaConfigSchema>;
export type ScradaAddCashbookLinesInput = z.infer<typeof scradaAddCashbookLinesSchema>;
