import { z } from "zod";
import { optionalLocationIdFields, pickLocationId } from "../../../location/schema.ts";

export const serviceItemSchema = z.object({
  appointment_segment_id: z.string().uuid("Invalid appointment_segment_id format").optional(),
  service_id: z.string().uuid("Invalid service_id format"),
  service_variant_id: z.string().uuid("Invalid service_variant_id format"),
  quantity: z.number().positive("Quantity must be positive").default(1),
  unit_price: z.number().nonnegative("Unit price must be non-negative"),
  vat_rate: z.number().min(0).max(100).optional().default(0),
  discount_amount: z.number().nonnegative("Discount amount must be non-negative").optional().default(0),
});

export const productItemSchema = z.object({
  product_id: z.string().uuid("Invalid product_id format"),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().nonnegative("Unit price must be non-negative"),
  vat_rate: z.number().min(0).max(100).optional().default(0),
  discount_amount: z.number().nonnegative("Discount amount must be non-negative").optional().default(0),
});

export const paymentItemSchema = z.object({
  payment_type: z.enum(["cash", "card", "invoice", "bank_transfer"], {
    errorMap: () => ({
      message: "Payment type must be one of: cash, card, invoice, bank_transfer",
    }),
  }),
  amount: z.number().nonnegative("Payment amount must be non-negative"),
  paid: z.boolean().optional().default(false),
});

// The POS client has historically sent a mix of camelCase and snake_case for
// these fields; normalize before validating rather than trusting one casing.
const rawBodySchema = z.any().transform((raw) => ({
  ...raw,
  company_id: raw?.company_id ?? raw?.companyId,
  appointment_id: raw?.appointment_id ?? raw?.appointmentId,
  client_id: raw?.client_id ?? raw?.clientId,
  date: raw?.date ?? raw?.order_date ?? raw?.orderDate,
  // POS (SalonFlow) sends snake_case location_id on walk-in / product-only
  // checkout, which often omits appointment_id. Accept locationId too.
  location_id: pickLocationId(raw ?? {}),
  payments: Array.isArray(raw?.payments)
    ? raw.payments.map((payment: any) => ({
      payment_type: payment.payment_type ?? payment.payment_method ?? payment.type,
      amount: payment.amount,
      paid: payment.paid ?? payment.is_paid ?? false,
    }))
    : raw?.payments,
}));

const orderBodySchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format"),
    appointment_id: z.string().uuid("Invalid appointment_id format").optional(),
    client_id: z.string().uuid("Invalid client_id format").optional(),
    // HTTP field stays `treatments` (ticket 3 is leftover aliases). Item ids are service_*.
    treatments: z.array(serviceItemSchema).optional().default([]),
    products: z.array(productItemSchema).optional().default([]),
    payments: z.array(paymentItemSchema).min(1, "At least one payment must be provided"),
    date: z.string().datetime("Invalid date format").optional(),
    notes: z.string().optional(),
    currency: z.string().default("eur").optional(),
    ...optionalLocationIdFields,
  })
  .refine(
    (data) => {
      return (data.treatments && data.treatments.length > 0) ||
        (data.products && data.products.length > 0);
    },
    {
      message: "At least one service or product must be provided",
      path: ["treatments", "products"],
    },
  )
  .transform(({ location_id, locationId, ...rest }) => ({
    ...rest,
    location_id: pickLocationId({ location_id, locationId }),
  }));

export const createOrderWithPaymentSchema = rawBodySchema.pipe(orderBodySchema);

export type CreateOrderWithPaymentInput = z.infer<typeof createOrderWithPaymentSchema>;
export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
export type ProductItemInput = z.infer<typeof productItemSchema>;
export type PaymentItemInput = z.infer<typeof paymentItemSchema>;
