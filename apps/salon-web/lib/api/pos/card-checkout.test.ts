import { collectCardIntentIds, resolveCardSaleFollowup } from "./card-checkout";
import type { CreateOrderV3PaymentResult } from "./mutations/order-create-response";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

const cardPayment: CreateOrderV3PaymentResult = {
  id: "pay-1",
  payment_type: "card",
  amount: 20,
  status: "pending",
  payment_status: "pending",
  paid: false,
  payment_intent_id: "pi_1",
};

function run() {
  assertEqual(
    collectCardIntentIds([cardPayment]),
    ["pi_1"],
    "collects card PaymentIntent ids for the reader",
  );
  assertEqual(
    collectCardIntentIds([
      { ...cardPayment, payment_type: "cash", payment_intent_id: null },
    ]),
    [],
    "cash lines are not terminal intents",
  );

  assertEqual(
    resolveCardSaleFollowup({
      requestedTerminal: true,
      data: { payments: [cardPayment] },
    }),
    { kind: "terminal", intentIds: ["pi_1"] },
    "Credit/Debit uses the terminal path",
  );

  assertEqual(
    resolveCardSaleFollowup({
      requestedTerminal: true,
      data: { payments: [{ ...cardPayment, payment_intent_id: null }] },
    }),
    { kind: "done" },
    "terminal without an intent id finishes the sale",
  );

  assertEqual(
    resolveCardSaleFollowup({
      requestedTerminal: false,
      data: { payments: [cardPayment] },
    }),
    { kind: "done" },
    "cash / pay-link sales do not open the reader",
  );
}

run();
console.log("card-checkout.test.ts passed");
