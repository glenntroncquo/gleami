import { createSupabaseClient } from "@/shared/supabase";
import { syncOrderPaymentStateInFunction } from "../sync-order-payment-state/logic.ts";
import type { OrderItemWebhookPayload } from "./schema.ts";

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

type ProductItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  discount_amount?: number;
};

type AddOperation = {
  op: "add";
  client_item_id?: string;
  item: ProductItem;
};

type UpdateOperation = {
  op: "update";
  order_item_id: string;
  item: ProductItem;
};

type RemoveOperation = {
  op: "remove";
  order_item_id: string;
};

export type StockOperation = AddOperation | UpdateOperation | RemoveOperation;

type StockUpdate = {
  product_id: string;
  requested_delta: number;
  applied_delta: number;
  clamped: boolean;
  stock_before: number;
  stock_after: number;
};

type OrderTotals = {
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
};

type SyncResult = {
  order_id: string;
  updated_items: string[];
  removed_items: string[];
  stock_updates: StockUpdate[];
  order_totals: OrderTotals | null;
  payment_summary: {
    order_id: string;
    company_id: string;
    payment_status: string;
    amount_paid: number;
    total_amount: number;
    remaining_due: number;
  } | null;
};

function clampDiscount(discountAmount: number, quantity: number, unitPrice: number) {
  const lineGross = quantity * unitPrice;
  return Math.min(Math.max(discountAmount || 0, 0), lineGross);
}

async function adjustProductStock(
  supabase: SupabaseClient,
  productId: string,
  delta: number,
): Promise<StockUpdate> {
  const { data: product, error: productError } = await supabase
    .from("product")
    .select("id, stock_qty")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    throw new Error(`Product ${productId} not found`);
  }

  const stockBefore = Number(product.stock_qty ?? 0);
  const requestedDelta = Number(delta);
  const stockAfter = requestedDelta < 0
    ? Math.max(0, stockBefore + requestedDelta)
    : stockBefore + requestedDelta;
  const appliedDelta = stockAfter - stockBefore;

  const { error: updateError } = await supabase
    .from("product")
    .update({
      stock_qty: stockAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (updateError) {
    throw new Error(`Failed to update product stock: ${updateError.message}`);
  }

  return {
    product_id: productId,
    requested_delta: requestedDelta,
    applied_delta: appliedDelta,
    clamped: appliedDelta !== requestedDelta,
    stock_before: stockBefore,
    stock_after: stockAfter,
  };
}

async function recalcOrderTotals(
  supabase: SupabaseClient,
  companyId: string,
  orderId: string,
): Promise<OrderTotals> {
  const { data: items, error: itemsError } = await supabase
    .from("order_item")
    .select("quantity, unit_price, vat_rate, discount_amount")
    .eq("order_id", orderId)
    .eq("company_id", companyId);

  if (itemsError) {
    throw new Error(`Failed to load order items for totals: ${itemsError.message}`);
  }

  let totalAmount = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const item of items || []) {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const vatRate = Number(item.vat_rate ?? 0);
    const discount = clampDiscount(Number(item.discount_amount ?? 0), quantity, unitPrice);
    const grossAfterDiscount = Math.max(0, quantity * unitPrice - discount);

    totalAmount += grossAfterDiscount;
    discountAmount += discount;
    taxAmount += vatRate > 0 ? grossAfterDiscount * (vatRate / (100 + vatRate)) : 0;
  }

  const subtotal = totalAmount - taxAmount;

  const totals = {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    discount_amount: Math.round(discountAmount * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
  };

  const { error: updateError } = await supabase
    .from("order")
    .update({
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      discount_amount: totals.discount_amount,
      total_amount: totals.total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("company_id", companyId);

  if (updateError) {
    throw new Error(`Failed to update order totals: ${updateError.message}`);
  }

  return totals;
}

type OrderItemRowLike = {
  product_id?: string | null;
  quantity?: number | null;
};

/** Product lines with positive quantity reserve stock; other rows are ignored for stock. */
function productStockEffect(row: OrderItemRowLike): { productId: string; quantity: number } | null {
  const productId = row.product_id;
  const quantity = Number(row.quantity ?? 0);
  if (!productId || quantity <= 0) return null;
  return { productId: String(productId), quantity };
}

export type WebhookSyncResult =
  | { skipped: true; reason: string }
  | ({ skipped: false } & SyncResult);

/**
 * Applies stock + order totals + payment state for a Supabase Database Webhook on `order_item`.
 * DELETE uses `old_record` only (row is already gone). UPDATE compares `old_record` vs `record`.
 */
export async function syncOrderItemsStockFromWebhook(
  supabase: SupabaseClient,
  payload: OrderItemWebhookPayload,
  options?: { recalculate_order_totals?: boolean },
): Promise<WebhookSyncResult> {
  const recalculate_order_totals = options?.recalculate_order_totals ?? true;

  if (payload.table !== "order_item" || payload.schema !== "public") {
    return { skipped: true, reason: "ignored_non_order_item_webhook" };
  }

  const stockUpdates: StockUpdate[] = [];
  let orderId: string;
  let companyId: string;
  let updatedItems: string[] = [];
  let removedItems: string[] = [];

  if (payload.type === "INSERT") {
    const row = payload.record;
    orderId = row.order_id;
    companyId = row.company_id;
    const effect = productStockEffect(row);
    if (effect) {
      stockUpdates.push(
        await adjustProductStock(supabase, effect.productId, -effect.quantity),
      );
    }
    updatedItems = [row.id];
  } else if (payload.type === "DELETE") {
    const row = payload.old_record;
    orderId = row.order_id;
    companyId = row.company_id;
    const effect = productStockEffect(row);
    if (effect) {
      stockUpdates.push(
        await adjustProductStock(supabase, effect.productId, effect.quantity),
      );
    }
    removedItems = [row.id];
  } else {
    const oldRow = payload.old_record;
    const newRow = payload.record;
    orderId = newRow.order_id;
    companyId = newRow.company_id;
    const oldEffect = productStockEffect(oldRow);
    const newEffect = productStockEffect(newRow);
    if (oldEffect) {
      stockUpdates.push(
        await adjustProductStock(supabase, oldEffect.productId, oldEffect.quantity),
      );
    }
    if (newEffect) {
      stockUpdates.push(
        await adjustProductStock(supabase, newEffect.productId, -newEffect.quantity),
      );
    }
    updatedItems = [newRow.id];
  }

  const { data: order, error: orderError } = await supabase
    .from("order")
    .select("id, company_id")
    .eq("id", orderId)
    .eq("company_id", companyId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order ${orderId} not found for company ${companyId}`);
  }

  const orderTotals = recalculate_order_totals
    ? await recalcOrderTotals(supabase, companyId, orderId)
    : null;

  const paymentSummary = await syncOrderPaymentStateInFunction(supabase, {
    order_id: orderId,
    company_id: companyId,
  });

  return {
    skipped: false,
    order_id: orderId,
    updated_items: updatedItems,
    removed_items: removedItems,
    stock_updates: stockUpdates,
    order_totals: orderTotals,
    payment_summary: paymentSummary,
  };
}

export async function syncOrderItemsStockInFunction(
  supabase: SupabaseClient,
  input: {
    company_id: string;
    order_id: string;
    operations: StockOperation[];
    recalculate_order_totals?: boolean;
  },
): Promise<SyncResult> {
  const {
    company_id,
    order_id,
    operations,
    recalculate_order_totals = true,
  } = input;

  const { data: order, error: orderError } = await supabase
    .from("order")
    .select("id, company_id")
    .eq("id", order_id)
    .eq("company_id", company_id)
    .single();

  if (orderError || !order) {
    throw new Error(`Order ${order_id} not found for company ${company_id}`);
  }

  const updatedItems: string[] = [];
  const removedItems: string[] = [];
  const stockUpdates: StockUpdate[] = [];

  for (const operation of operations) {
    if (operation.op === "add") {
      const quantity = Number(operation.item.quantity);
      const unitPrice = Number(operation.item.unit_price);
      const vatRate = Number(operation.item.vat_rate || 0);
      const discountAmount = clampDiscount(
        Number(operation.item.discount_amount || 0),
        quantity,
        unitPrice,
      );
      const lineTotal = Math.round((quantity * unitPrice - discountAmount) * 100) / 100;

      const { data: createdItem, error: createError } = await supabase
        .from("order_item")
        .insert({
          order_id,
          company_id,
          appointment_id: null,
          service_id: null,
          service_variant_id: null,
          product_id: operation.item.product_id,
          quantity,
          unit_price: unitPrice,
          vat_rate: vatRate,
          discount_amount: discountAmount,
          total: lineTotal,
        })
        .select("id")
        .single();

      if (createError || !createdItem) {
        throw new Error(`Failed to create order item: ${createError?.message || "Unknown error"}`);
      }

      updatedItems.push(createdItem.id);
      stockUpdates.push(
        await adjustProductStock(supabase, operation.item.product_id, -quantity),
      );
      continue;
    }

    if (operation.op === "update") {
      const { data: existing, error: existingError } = await supabase
        .from("order_item")
        .select("id, product_id, quantity")
        .eq("id", operation.order_item_id)
        .eq("order_id", order_id)
        .eq("company_id", company_id)
        .single();

      if (existingError || !existing) {
        throw new Error(`order_item ${operation.order_item_id} not found for order ${order_id}`);
      }

      if (existing.product_id && Number(existing.quantity || 0) > 0) {
        stockUpdates.push(
          await adjustProductStock(
            supabase,
            String(existing.product_id),
            Number(existing.quantity),
          ),
        );
      }

      const quantity = Number(operation.item.quantity);
      if (quantity === 0) {
        const { error: deleteError } = await supabase
          .from("order_item")
          .delete()
          .eq("id", operation.order_item_id);

        if (deleteError) {
          throw new Error(`Failed to delete order item: ${deleteError.message}`);
        }

        removedItems.push(operation.order_item_id);
        continue;
      }

      const unitPrice = Number(operation.item.unit_price);
      const vatRate = Number(operation.item.vat_rate || 0);
      const discountAmount = clampDiscount(
        Number(operation.item.discount_amount || 0),
        quantity,
        unitPrice,
      );
      const lineTotal = Math.round((quantity * unitPrice - discountAmount) * 100) / 100;

      const { error: updateError } = await supabase
        .from("order_item")
        .update({
          product_id: operation.item.product_id,
          appointment_id: null,
          service_id: null,
          service_variant_id: null,
          quantity,
          unit_price: unitPrice,
          vat_rate: vatRate,
          discount_amount: discountAmount,
          total: lineTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", operation.order_item_id);

      if (updateError) {
        throw new Error(`Failed to update order item: ${updateError.message}`);
      }

      updatedItems.push(operation.order_item_id);
      stockUpdates.push(
        await adjustProductStock(supabase, operation.item.product_id, -quantity),
      );
      continue;
    }

    if (operation.op === "remove") {
      const { data: existing, error: existingError } = await supabase
        .from("order_item")
        .select("id, product_id, quantity")
        .eq("id", operation.order_item_id)
        .eq("order_id", order_id)
        .eq("company_id", company_id)
        .single();

      if (existingError || !existing) {
        throw new Error(`order_item ${operation.order_item_id} not found for order ${order_id}`);
      }

      if (existing.product_id && Number(existing.quantity || 0) > 0) {
        stockUpdates.push(
          await adjustProductStock(
            supabase,
            String(existing.product_id),
            Number(existing.quantity),
          ),
        );
      }

      const { error: deleteError } = await supabase
        .from("order_item")
        .delete()
        .eq("id", operation.order_item_id);

      if (deleteError) {
        throw new Error(`Failed to delete order item: ${deleteError.message}`);
      }

      removedItems.push(operation.order_item_id);
    }
  }

  const orderTotals = recalculate_order_totals
    ? await recalcOrderTotals(supabase, company_id, order_id)
    : null;

  const paymentSummary = await syncOrderPaymentStateInFunction(supabase, {
    order_id,
    company_id,
  });

  return {
    order_id,
    updated_items: updatedItems,
    removed_items: removedItems,
    stock_updates: stockUpdates,
    order_totals: orderTotals,
    payment_summary: paymentSummary,
  };
}
