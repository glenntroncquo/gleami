import {
  buildOrderCreatePayments,
  paymentMethodMessageKey,
  splitHasCardAmount,
  splitHasPayLinkAmount,
  splitHasTerminalAmount,
  splitPayLinkAmount,
  type SplitPayment,
} from "./payment-methods";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function run() {
  const cash: SplitPayment = { id: "1", method: "cash", amount: 20 };
  const cardZero: SplitPayment = { id: "2", method: "card", amount: 0 };
  const card: SplitPayment = { id: "3", method: "card", amount: 15 };

  assertEqual(splitHasCardAmount(undefined), false, "missing splits have no card");
  assertEqual(splitHasCardAmount([cash]), false, "cash only is not a card charge");
  assertEqual(
    splitHasCardAmount([cash, cardZero]),
    false,
    "zero-amount card lines do not count",
  );
  assertEqual(
    splitHasCardAmount([cash, card]),
    true,
    "a positive card line needs Connect charges",
  );

  const terminal: SplitPayment = { id: "4", method: "terminal", amount: 15 };
  assertEqual(
    splitHasCardAmount([terminal]),
    true,
    "terminal also needs Connect charges",
  );
  assertEqual(
    splitHasTerminalAmount([card]),
    true,
    "Credit/Debit Card is the terminal / reader method",
  );
  assertEqual(
    splitHasTerminalAmount([terminal]),
    true,
    "Kaartterminal uses the reader path",
  );

  const payLink: SplitPayment = { id: "5", method: "pay_link", amount: 12.5 };
  assertEqual(
    splitHasPayLinkAmount([payLink]),
    true,
    "Betaallink lines need a checkout session",
  );
  assertEqual(
    splitHasCardAmount([payLink]),
    true,
    "Betaallink is gated on Connect charges",
  );
  assertEqual(splitPayLinkAmount([cash, payLink]), 12.5, "sums pay-link amount");
  assertEqual(
    paymentMethodMessageKey("pay_link"),
    "payLink",
    "i18n key for Betaallink",
  );

  const created = buildOrderCreatePayments([cash, card, terminal, payLink]);
  assertEqual(
    created,
    [
      { payment_type: "cash", amount: 20, paid: true },
      { payment_type: "card", amount: 15, paid: true },
      { payment_type: "card", amount: 15, paid: true },
      { payment_type: "pay_link", amount: 12.5, paid: false },
    ],
    "card and terminal stay paid for the reader; Betaallink stays unpaid until webhook",
  );
}

run();
console.log("payment-section-card.test.ts passed");
