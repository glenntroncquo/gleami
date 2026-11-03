import { createSupabaseClient } from "../../functions/_shared/infrastructure/supabase/client.ts";
import {
  syncOrderItemsStockFromWebhook,
  type OrderItemWebhookPayload,
} from "../../functions/_shared/order/sync-stock.ts";

export async function syncStock(payload: OrderItemWebhookPayload) {
  const result = await syncOrderItemsStockFromWebhook(createSupabaseClient(), payload);
  if (result.skipped) {
    return { skipped: result.reason, orderId: null, stockUpdateCount: 0 };
  }
  return {
    skipped: null,
    orderId: result.order_id,
    stockUpdateCount: result.stock_updates.length,
  };
}
