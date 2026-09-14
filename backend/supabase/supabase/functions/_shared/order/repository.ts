import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toOrder, toPayment } from "./mapper.ts";
import { writeOrderItemCatalogColumns } from "./catalog-ids.ts";
import type { Order, Payment } from "./entity.ts";

const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomOrderCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ORDER_NUMBER_ALPHABET[bytes[i]! % ORDER_NUMBER_ALPHABET.length]!;
  }
  return out;
}

export interface CreateOrderParams {
  companyId: string;
  clientId: string | null;
  locationId?: string | null;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  date: string;
  notes: string | null;
}

export interface CreateOrderItemParams {
  orderId: string;
  companyId: string;
  locationId?: string | null;
  appointmentId: string | null;
  appointmentSegmentId: string | null;
  serviceId: string | null;
  serviceVariantId: string | null;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountAmount: number;
  total: number;
}

export interface CreatePaymentParams {
  orderId: string;
  companyId: string;
  locationId?: string | null;
  paymentMethod: string;
  paymentProvider: string;
  amount: number;
  amountGross: number;
  status: string;
  paymentStatus: string;
  paidAt: string | null;
  providerPaymentIntentId: string | null;
}

export interface MarkPaymentSucceededParams {
  amount: number;
  amountGross: number;
  providerChargeId: string | null;
  lastFourDigits: string | null;
  cardType: string | null;
  cardBrand: string | null;
  paidAt: string;
}

export interface PaymentRef {
  id: string;
  orderId: string | null;
  companyId: string | null;
  locationId: string | null;
}

export const orderRepository = {
  async findById(id: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from("order")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch order by id", { cause: error });
    }

    return data ? toOrder(data) : null;
  },

  async findManyByCompanyId(companyId: string): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from("order")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      throw new RepositoryError("Failed to fetch orders by company id", { cause: error });
    }

    return (data ?? []).map(toOrder);
  },

  /** Short human-friendly reference, e.g. `ORD-8K3H9P`, unique per company. */
  async generateUniqueOrderNumber(companyId: string): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const orderNumber = `ORD-${randomOrderCode(6)}`;
      const { data, error } = await supabaseAdmin
        .from("order")
        .select("id")
        .eq("company_id", companyId)
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) {
        throw new RepositoryError("Failed to allocate order number", { cause: error });
      }
      if (!data) return orderNumber;
    }

    throw new RepositoryError("Could not allocate a unique order number");
  },

  async create(params: CreateOrderParams): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from("order")
      .insert({
        company_id: params.companyId,
        client_id: params.clientId,
        ...(params.locationId && { location_id: params.locationId }),
        order_number: params.orderNumber,
        status: "pending",
        payment_status: "unpaid",
        subtotal: params.subtotal,
        tax_amount: params.taxAmount,
        discount_amount: params.discountAmount,
        total_amount: params.totalAmount,
        amount_paid: 0,
        date: params.date,
        notes: params.notes,
      })
      .select()
      .single();

    if (error || !data) {
      throw new RepositoryError("Failed to create order", { cause: error });
    }

    return toOrder(data);
  },

  /**
   * Inserts only service_id / service_variant_id. Leftover treatment_id /
   * price_option_id are not written so a later SQL DROP can remove them.
   * Reads still fall back to leftover columns until that DROP.
   */
  async createOrderItems(items: CreateOrderItemParams[]): Promise<void> {
    const { error } = await supabaseAdmin.from("order_item").insert(
      items.map((item) => ({
        order_id: item.orderId,
        company_id: item.companyId,
        ...(item.locationId && { location_id: item.locationId }),
        appointment_id: item.appointmentId,
        appointment_segment_id: item.appointmentSegmentId,
        ...writeOrderItemCatalogColumns(item.serviceId, item.serviceVariantId),
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        vat_rate: item.vatRate,
        discount_amount: item.discountAmount,
        total: item.total,
      })),
    );

    if (error) {
      throw new RepositoryError("Failed to create order items", { cause: error });
    }
  },

  async createPayment(params: CreatePaymentParams): Promise<Payment> {
    const { data, error } = await supabaseAdmin
      .from("payment")
      .insert({
        order_id: params.orderId,
        company_id: params.companyId,
        ...(params.locationId && { location_id: params.locationId }),
        payment_method: params.paymentMethod,
        payment_provider: params.paymentProvider,
        amount: params.amount,
        amount_gross: params.amountGross,
        status: params.status,
        payment_status: params.paymentStatus,
        ...(params.paidAt && { paid_at: params.paidAt }),
        ...(params.providerPaymentIntentId && {
          provider_payment_intent_id: params.providerPaymentIntentId,
        }),
      })
      .select()
      .single();

    if (error || !data) {
      throw new RepositoryError("Failed to create payment record", { cause: error });
    }

    return toPayment(data);
  },

  async findProductOrderItemIds(orderId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("order_item")
      .select("id")
      .eq("order_id", orderId)
      .not("product_id", "is", null);

    if (error) {
      throw new RepositoryError("Failed to fetch product order items", { cause: error });
    }

    return (data ?? []).map((row) => row.id);
  },

  /** Best-effort cleanup used only mid-rollback, when the request is already
   * failing - errors here are swallowed by design, matching the original
   * behavior, rather than masking the real failure that triggered rollback. */
  async deleteCascade(orderId: string): Promise<void> {
    await supabaseAdmin.from("payment").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_item").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order").delete().eq("id", orderId);
  },

  async findPaymentByProviderIntentId(paymentIntentId: string): Promise<PaymentRef | null> {
    const { data, error } = await supabaseAdmin
      .from("payment")
      .select("id, order_id, company_id, location_id")
      .eq("provider_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch payment by provider payment intent id", { cause: error });
    }

    return data
      ? {
        id: data.id,
        orderId: data.order_id,
        companyId: data.company_id,
        locationId: data.location_id,
      }
      : null;
  },

  async markPaymentSucceeded(paymentId: string, params: MarkPaymentSucceededParams): Promise<void> {
    const { error } = await supabaseAdmin
      .from("payment")
      .update({
        status: "succeeded",
        payment_status: "paid",
        amount: params.amount,
        amount_gross: params.amountGross,
        provider_charge_id: params.providerChargeId,
        last_four_digits: params.lastFourDigits,
        card_type: params.cardType,
        card_brand: params.cardBrand,
        paid_at: params.paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) {
      throw new RepositoryError("Failed to update payment as succeeded", { cause: error });
    }
  },

  async markPaymentFailed(paymentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("payment")
      .update({
        status: "failed",
        payment_status: "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) {
      throw new RepositoryError("Failed to update payment as failed", { cause: error });
    }
  },

  async markPaymentCanceled(paymentId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("payment")
      .update({
        status: "canceled",
        payment_status: "unpaid",
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) {
      throw new RepositoryError("Failed to update payment as canceled", { cause: error });
    }
  },
};
