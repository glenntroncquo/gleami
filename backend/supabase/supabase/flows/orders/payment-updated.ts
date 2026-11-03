import { Flow } from "@pgflow/dsl";
import { syncPaymentState } from "./sync-payment-state.ts";

type Input = {
  orderId: string;
  companyId: string | null;
};

export const PaymentUpdated = new Flow<Input>({
  slug: "payment_updated",
})
  .step(
    { slug: "syncPaymentState", maxAttempts: 5, baseDelay: 2 },
    async (input) => await syncPaymentState(input),
  );
