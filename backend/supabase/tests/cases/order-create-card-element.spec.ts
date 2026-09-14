import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cardPaymentElementCreateParams,
  paymentElementClientSecret,
} from "../../supabase/functions/_shared/order/commands/create-with-payment/card-payment-intent.ts";
import { orderCreateSuccessEnvelope } from "../../supabase/functions/_shared/order/commands/create-with-payment/envelope.ts";
import { cardDetailsFromCharge } from "../../supabase/functions/_shared/order/commands/handle-payment-webhook/card-details.ts";

const handlerSource = readFileSync(
  "supabase/functions/_shared/order/commands/create-with-payment/handler.ts",
  "utf8",
);
const edgeSource = readFileSync("supabase/functions/order-create/index.ts", "utf8");

const cardPayment = {
  id: "pay_1",
  payment_type: "card",
  amount: 25,
  status: "pending",
  payment_status: "unpaid",
  paid: false,
  payment_intent_id: "pi_test",
  client_secret: "pi_test_secret_abc",
};

const cashPayment = {
  id: "pay_cash",
  payment_type: "cash",
  amount: 10,
  status: "succeeded",
  payment_status: "paid",
  paid: true,
  payment_intent_id: null,
  client_secret: null,
};

describe("card Payment Element PI params", () => {
  it("creates a destination card PI, not card_present", () => {
    const params = cardPaymentElementCreateParams(2599, "EUR", "acct_dest");

    expect(params).toEqual({
      amount: 2599,
      currency: "eur",
      payment_method_types: ["card"],
      capture_method: "automatic",
      transfer_data: { destination: "acct_dest" },
      application_fee_amount: 0,
    });
    expect(JSON.stringify(params)).not.toContain("card_present");
  });

  it("treats missing/blank client_secret as absent (no silent skip)", () => {
    expect(paymentElementClientSecret({ client_secret: "pi_x_secret_1" })).toBe("pi_x_secret_1");
    expect(paymentElementClientSecret({ client_secret: "  " })).toBeNull();
    expect(paymentElementClientSecret({ client_secret: null })).toBeNull();
    expect(paymentElementClientSecret({})).toBeNull();
    expect(paymentElementClientSecret(null)).toBeNull();
  });
});

describe("order-create card envelope", () => {
  it("keeps OkResponse { success, data: { order_id, payments } } and publishes data.payments[].client_secret", () => {
    const envelope = orderCreateSuccessEnvelope("ord_1", [cardPayment, cashPayment]);

    expect(envelope).toEqual({
      success: true,
      data: {
        order_id: "ord_1",
        payments: [cardPayment, cashPayment],
      },
    });
    expect(envelope.data.payments[0]?.client_secret).toBe("pi_test_secret_abc");
    expect(envelope.data.payments[0]?.payment_intent_id).toBe("pi_test");
    expect(envelope.data.payments[1]?.client_secret).toBeNull();
    expect(envelope).not.toHaveProperty("client_secret");
    expect(envelope).not.toHaveProperty("clientSecret");
    expect(envelope).not.toHaveProperty("payments");
    expect(envelope.data).not.toHaveProperty("client_secret");
    expect(envelope.data).not.toHaveProperty("orderId");
  });
});

describe("order-create card wiring", () => {
  it("uses Payment Element helpers and fails closed without a secret", () => {
    expect(handlerSource).toContain("cardPaymentElementCreateParams");
    expect(handlerSource).toContain("paymentElementClientSecret");
    expect(handlerSource).toContain('outcome: "missing_client_secret"');
    expect(handlerSource).not.toContain("card_present");
    expect(edgeSource).toContain("orderCreateSuccessEnvelope");
    expect(edgeSource).toContain("STRIPE_CLIENT_SECRET_MISSING");
  });
});

describe("payment-webhook card details", () => {
  it("prefers online card, falls back to card_present", () => {
    expect(
      cardDetailsFromCharge({
        payment_method_details: { card: { last4: "4242", brand: "visa" } },
      }),
    ).toEqual({ lastFourDigits: "4242", cardType: "visa", cardBrand: "visa" });

    expect(
      cardDetailsFromCharge({
        payment_method_details: { card_present: { last4: "1111", brand: "mastercard" } },
      }),
    ).toEqual({ lastFourDigits: "1111", cardType: "mastercard", cardBrand: "mastercard" });

    expect(cardDetailsFromCharge(null)).toEqual({
      lastFourDigits: null,
      cardType: null,
      cardBrand: null,
    });
  });
});
