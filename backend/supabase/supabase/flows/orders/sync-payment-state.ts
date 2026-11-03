import { createSupabaseClient } from "../../functions/_shared/infrastructure/supabase/client.ts";
import { syncOrderPaymentStateInFunction } from "../../functions/_shared/order/sync-payment-state.ts";

type Input = {
  orderId: string;
  companyId: string | null;
};

export async function syncPaymentState(input: Input) {
  return await syncOrderPaymentStateInFunction(createSupabaseClient(), {
    order_id: input.orderId,
    company_id: input.companyId ?? undefined,
  });
}
