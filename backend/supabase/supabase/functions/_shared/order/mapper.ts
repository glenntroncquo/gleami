import type { Database } from "@/types/database";
import type { Order, OrderItem, Payment } from "./entity.ts";
import { resolveOrderItemCatalogIds } from "./catalog-ids.ts";

export {
  resolveOrderItemCatalogIds,
  writeOrderItemCatalogColumns,
} from "./catalog-ids.ts";
export type { OrderItemCatalogIds } from "./catalog-ids.ts";

type OrderRow = Database["public"]["Tables"]["order"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_item"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payment"]["Row"];

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id,
    locationId: row.location_id,
    orderNumber: row.order_number,
    date: row.date,
    status: row.status,
    paymentStatus: row.payment_status,
    subtotal: row.subtotal,
    discountAmount: row.discount_amount,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount,
    amountPaid: row.amount_paid,
    notes: row.notes,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOrderItem(row: OrderItemRow): OrderItem {
  const catalog = resolveOrderItemCatalogIds(row);
  return {
    id: row.id,
    companyId: row.company_id,
    orderId: row.order_id,
    locationId: row.location_id,
    productId: row.product_id,
    serviceId: catalog.serviceId,
    serviceVariantId: catalog.serviceVariantId,
    treatmentId: row.treatment_id,
    priceOptionId: row.price_option_id,
    appointmentId: row.appointment_id,
    appointmentSegmentId: row.appointment_segment_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    discountAmount: row.discount_amount,
    vatRate: row.vat_rate,
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    companyId: row.company_id,
    orderId: row.order_id,
    locationId: row.location_id,
    cashbookId: row.cashbook_id,
    amount: row.amount,
    amountGross: row.amount_gross,
    totalCashReceived: row.total_cash_received,
    paymentMethod: row.payment_method,
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    status: row.status,
    cardBrand: row.card_brand,
    cardType: row.card_type,
    lastFourDigits: row.last_four_digits,
    processorRef: row.processor_ref,
    providerChargeId: row.provider_charge_id,
    providerPaymentIntentId: row.provider_payment_intent_id,
    providerRefundId: row.provider_refund_id,
    notes: row.notes,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
