import {
  buildPayLinkReturnUrls,
  buildPaymentCreateCheckoutBody,
  CLIENT_EMAIL_REQUIRED,
  isClientEmailRequiredError,
  parsePaymentCreateCheckoutResponse,
  PAYMENT_CREATE_CHECKOUT_FN,
  readClientEmail,
} from "./payment-create-checkout";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

const LIVE_DATA = {
  url: "https://checkout.stripe.com/c/pay/cs_test_abc",
  session_id: "cs_test_abc",
  order_id: "ord-1",
  payment_id: "pay-1",
  email: "client@salon.test",
};

function run() {
  assertEqual(
    PAYMENT_CREATE_CHECKOUT_FN,
    "payment-create-checkout",
    "locked edge name",
  );

  assertEqual(
    buildPayLinkReturnUrls("https://app.gleami.test/", "nl"),
    {
      success_url: "https://app.gleami.test/nl?pay_link=success",
      cancel_url: "https://app.gleami.test/nl?pay_link=cancel",
    },
    "return urls follow locale origin",
  );

  assertEqual(
    buildPaymentCreateCheckoutBody({
      company_id: "co-1",
      order_id: "ord-1",
      success_url: "https://app.gleami.test/nl?pay_link=success",
      cancel_url: "https://app.gleami.test/nl?pay_link=cancel",
      amount: 12.345,
      client_email: "  client@salon.test  ",
      location_id: "loc-1",
    }),
    {
      company_id: "co-1",
      order_id: "ord-1",
      success_url: "https://app.gleami.test/nl?pay_link=success",
      cancel_url: "https://app.gleami.test/nl?pay_link=cancel",
      amount: 12.35,
      client_email: "client@salon.test",
      location_id: "loc-1",
    },
    "body trims email and rounds amount",
  );

  assertEqual(
    Object.prototype.hasOwnProperty.call(
      buildPaymentCreateCheckoutBody({
        company_id: "co-1",
        order_id: "ord-1",
        success_url: "https://ok",
        cancel_url: "https://cancel",
      }),
      "amount",
    ),
    false,
    "omit amount when BE should default to remaining due",
  );

  const unwrapped = parsePaymentCreateCheckoutResponse({
    success: true,
    data: { data: LIVE_DATA },
  });
  assertEqual(unwrapped.success, true, "unwraps data.data.url envelope");
  assertEqual(unwrapped.data, LIVE_DATA, "reads nested checkout session");

  const asText = parsePaymentCreateCheckoutResponse(
    JSON.stringify({ success: true, data: LIVE_DATA }),
  );
  assertEqual(asText.success, true, "parses invoke text body");
  assertEqual(asText.data?.url, LIVE_DATA.url, "text envelope still yields url");

  const missingEmail = parsePaymentCreateCheckoutResponse({
    success: false,
    error: CLIENT_EMAIL_REQUIRED,
    code: CLIENT_EMAIL_REQUIRED,
    message: "Client email is required",
  });
  assertEqual(missingEmail.success, false, "400 email envelope is not success");
  assertEqual(
    isClientEmailRequiredError(missingEmail),
    true,
    "maps CLIENT_EMAIL_REQUIRED",
  );

  assertEqual(
    readClientEmail("  ", null, "not-an-email", "ada@salon.test"),
    "ada@salon.test",
    "picks the first usable email",
  );
  assertEqual(
    readClientEmail(undefined, "   "),
    null,
    "missing email stays null",
  );
}

run();
console.log("payment-create-checkout.test.ts passed");
