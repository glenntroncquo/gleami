import { z } from "zod";

/** Scrada dagontvangsten = journal lines (not kasboek / cash book). */
export const scradaConfigSchema = z.object({
  journal_id: z.string().uuid("Invalid journal_id in config (dagontvangsten dagboek)"),
  vat_type_id: z.string().uuid("Invalid vat_type_id in config"),
  vat_percentage: z.number().min(0).max(100),
  category_id: z.string().uuid("Invalid category_id in config (VAT category)"),
  /**
   * Salonify `payment_method` → Scrada journal payment method UUID.
   * Update when Scrada IDs change (GET .../journal/{id}/paymentMethod).
   */
  payment_method_map: z.object({
    cash: z.string().uuid(),
    bank_transfer: z.string().uuid(),
    card: z.string().uuid(),
    /** If omitted, Salonify `invoice` uses `bank_transfer`. */
    invoice: z.string().uuid().optional(),
  }),
  language: z.enum(["NL", "FR", "EN"]).optional(),
});

export const scradaSyncDagontvangstenSchema = z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  payment_ids: z
    .array(z.string().uuid("Invalid payment_id format"))
    .min(1, "At least one payment_id is required"),
});

export type ScradaConfig = z.infer<typeof scradaConfigSchema>;
export type ScradaSyncDagontvangstenInput = z.infer<typeof scradaSyncDagontvangstenSchema>;
