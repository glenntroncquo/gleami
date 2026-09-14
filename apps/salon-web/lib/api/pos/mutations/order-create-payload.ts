export type PaymentType =
  | "cash"
  | "card"
  | "invoice"
  | "bank_transfer"
  | "pay_link";

/**
 * Service line for order-create.
 * HTTP array key is `treatments`; item ids are service_id / service_variant_id.
 */
export interface OrderCreateTreatmentItem {
  appointment_segment_id?: string;
  service_id: string;
  service_variant_id: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  discount_amount?: number;
}

export interface OrderCreateProductItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  discount_amount?: number;
}

export interface CreateOrderV3PaymentInput {
  payment_type: PaymentType;
  amount: number;
  paid: boolean;
}

/**
 * Client request for POST /functions/v1/order-create.
 * The service-line array MUST be `treatments`. Sending `services` instead
 * leaves treatments defaulting to [] on the backend and fails with
 * "treatments.products: At least one service or product must be provided".
 */
export interface CreateOrderWithPaymentV3Request {
  company_id: string;
  location_id?: string;
  date: string;
  appointment_id?: string;
  client_id?: string;
  treatments?: OrderCreateTreatmentItem[];
  products?: OrderCreateProductItem[];
  payments: CreateOrderV3PaymentInput[];
  notes?: string;
  currency?: string;
}

export interface OrderCreateHttpBody {
  company_id: string;
  location_id?: string;
  date: string;
  appointment_id?: string;
  client_id?: string;
  treatments?: OrderCreateTreatmentItem[];
  products?: OrderCreateProductItem[];
  payments: CreateOrderV3PaymentInput[];
  notes?: string;
  currency?: string;
}

/**
 * Explicit order-create body. Never forwards a `services` catalog/array —
 * backend only reads `treatments` + `products`.
 */
export function buildOrderCreateHttpBody(
  request: CreateOrderWithPaymentV3Request,
  normalizedDate: string,
): OrderCreateHttpBody {
  const body: OrderCreateHttpBody = {
    company_id: request.company_id,
    date: normalizedDate,
    payments: request.payments,
  };

  if (request.location_id) {
    body.location_id = request.location_id;
  }
  if (request.appointment_id) {
    body.appointment_id = request.appointment_id;
  }
  if (request.client_id) {
    body.client_id = request.client_id;
  }
  if (request.treatments && request.treatments.length > 0) {
    body.treatments = request.treatments;
  }
  if (request.products && request.products.length > 0) {
    body.products = request.products;
  }
  if (request.notes) {
    body.notes = request.notes;
  }
  if (request.currency) {
    body.currency = request.currency;
  }

  return body;
}
