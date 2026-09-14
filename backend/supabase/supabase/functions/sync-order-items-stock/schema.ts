import { z } from "zod";

/** Minimal row shape from Supabase Database Webhooks on `public.order_item`. */
export const orderItemWebhookRowSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  company_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().nonnegative().nullable().optional(),
}).passthrough();

const insertPayloadSchema = z.object({
  type: z.literal("INSERT"),
  table: z.string(),
  schema: z.string(),
  record: orderItemWebhookRowSchema,
  old_record: z.null().optional(),
});

const updatePayloadSchema = z.object({
  type: z.literal("UPDATE"),
  table: z.string(),
  schema: z.string(),
  record: orderItemWebhookRowSchema,
  old_record: orderItemWebhookRowSchema,
});

const deletePayloadSchema = z.object({
  type: z.literal("DELETE"),
  table: z.string(),
  schema: z.string(),
  record: z.null().optional(),
  old_record: orderItemWebhookRowSchema,
});

export const orderItemWebhookSchema = z.discriminatedUnion("type", [
  insertPayloadSchema,
  updatePayloadSchema,
  deletePayloadSchema,
]);

export type OrderItemWebhookPayload = z.infer<typeof orderItemWebhookSchema>;
