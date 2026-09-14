import {
  CHARGES_NOT_ENABLED,
  isChargesNotEnabledError,
  parseOrderCreateResponse,
} from "./order-create-response";

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
  const created = parseOrderCreateResponse(200, {
    success: true,
    data: {
      order_id: "ord-1",
      payments: [
        {
          id: "pay-1",
          payment_type: "card",
          amount: 20,
          status: "pending",
          payment_status: "pending",
          paid: false,
          payment_intent_id: "pi_1",
          client_secret: "pi_1_secret_abc",
        },
      ],
      client_secret: "pi_1_secret_abc",
    },
  });
  assertEqual(created.success, true, "200 success keeps the order payload");
  assertEqual(created.data?.order_id, "ord-1", "order id is forwarded");
  assertEqual(
    created.data?.payments[0]?.client_secret,
    "pi_1_secret_abc",
    "forwards Payment Element client_secret",
  );
  assertEqual(created.status, 200, "http status is recorded");

  const blocked = parseOrderCreateResponse(409, {
    success: false,
    error: CHARGES_NOT_ENABLED,
    message: "Connected account cannot accept charges",
  });
  assertEqual(blocked.success, false, "409 is not a successful create");
  assertEqual(blocked.code, CHARGES_NOT_ENABLED, "maps 409 error to code");
  assertEqual(blocked.error, CHARGES_NOT_ENABLED, "preserves error token");
  assertEqual(
    isChargesNotEnabledError(blocked),
    true,
    "helper recognizes CHARGES_NOT_ENABLED from error",
  );

  const coded = parseOrderCreateResponse(409, {
    success: false,
    code: CHARGES_NOT_ENABLED,
    message: "charges off",
  });
  assertEqual(
    isChargesNotEnabledError(coded),
    true,
    "helper recognizes CHARGES_NOT_ENABLED from code",
  );

  const other = parseOrderCreateResponse(400, {
    success: false,
    error: "VALIDATION",
    message: "bad request",
  });
  assertEqual(other.code, undefined, "other errors do not become charges code");
  assertEqual(
    isChargesNotEnabledError(other),
    false,
    "validation errors are not charges blocks",
  );

  const invokeWrapped = parseOrderCreateResponse(200, {
    success: true,
    data: {
      success: true,
      data: {
        order_id: "ord-2",
        payments: [
          {
            id: "pay-2",
            payment_type: "card",
            amount: 20,
            status: "pending",
            payment_status: "pending",
            paid: false,
            payment_intent_id: "pi_2",
            client_secret: "pi_2_secret_nested",
          },
        ],
      },
    },
  });
  assertEqual(invokeWrapped.success, true, "walks a second { success, data } envelope");
  assertEqual(invokeWrapped.data?.order_id, "ord-2", "inner order id is used");
  assertEqual(
    invokeWrapped.data?.payments[0]?.client_secret,
    "pi_2_secret_nested",
    "Elements secret is at data.data.payments[].client_secret",
  );

  const asText = parseOrderCreateResponse(
    200,
    JSON.stringify({
      success: true,
      data: {
        order_id: "ord-3",
        payments: [
          {
            id: "pay-3",
            payment_type: "card",
            amount: 20,
            status: "pending",
            payment_status: "pending",
            paid: false,
            payment_intent_id: "pi_3",
            client_secret: "pi_3_secret_text",
          },
        ],
      },
    }),
  );
  assertEqual(asText.success, true, "parses text/plain JSON like functions.invoke");
  assertEqual(
    asText.data?.payments[0]?.client_secret,
    "pi_3_secret_text",
    "text envelope still yields payments[].client_secret",
  );

  const nullBody = parseOrderCreateResponse(200, null);
  assertEqual(nullBody.success, false, "null invoke data is not a created order");

  const singularPayment = parseOrderCreateResponse(200, {
    success: true,
    data: {
      order_id: "ord-4",
      payment: {
        id: "pay-4",
        payment_type: "card",
        amount: 20,
        status: "pending",
        payment_status: "pending",
        paid: false,
        payment_intent_id: "pi_4",
        client_secret: "pi_4_secret_singular",
      },
    },
  });
  assertEqual(singularPayment.success, true, "singular payment is an order payload");
  assertEqual(
    singularPayment.data?.payments[0]?.client_secret,
    "pi_4_secret_singular",
    "normalizes payment.client_secret into payments[]",
  );
  assertEqual(
    singularPayment.data?.client_secret,
    "pi_4_secret_singular",
    "lifts payment.client_secret to the order data root",
  );

  const nestedIntent = parseOrderCreateResponse(200, {
    success: true,
    data: {
      order_id: "ord-5",
      payments: [
        {
          id: "pay-5",
          payment_type: "card",
          amount: 20,
          status: "pending",
          payment_status: "pending",
          paid: false,
          payment_intent_id: "pi_5",
        },
      ],
      payment_intent: { client_secret: "pi_5_secret_intent" },
    },
  });
  assertEqual(
    nestedIntent.data?.client_secret,
    "pi_5_secret_intent",
    "lifts data.payment_intent.client_secret",
  );

  const topLevel = parseOrderCreateResponse(200, {
    success: true,
    client_secret: "pi_6_secret_top",
    data: {
      order_id: "ord-6",
      payments: [
        {
          id: "pay-6",
          payment_type: "card",
          amount: 20,
          status: "pending",
          payment_status: "pending",
          paid: false,
          payment_intent_id: "pi_6",
        },
      ],
    },
  });
  assertEqual(
    topLevel.data?.client_secret,
    "pi_6_secret_top",
    "lifts envelope-level client_secret",
  );

  const liveQa = parseOrderCreateResponse(
    200,
    JSON.stringify({
      success: true,
      data: {
        order_id: "ord-live-qa",
        client_secret: "pi_live_secret_qa",
        payments: [
          {
            payment_type: "card",
            paid: false,
            status: "pending",
            payment_intent_id: "pi_live",
            client_secret: "pi_live_secret_qa",
          },
        ],
      },
    }),
  );
  assertEqual(liveQa.success, true, "live QA 200 text body is a created order");
  assertEqual(liveQa.data?.order_id, "ord-live-qa", "live QA order id");
  assertEqual(
    liveQa.data?.client_secret,
    "pi_live_secret_qa",
    "live QA data.client_secret",
  );
  assertEqual(
    liveQa.data?.payments[0]?.client_secret,
    "pi_live_secret_qa",
    "live QA payments[0].client_secret",
  );
  assertEqual(
    liveQa.data?.payments[0]?.paid,
    false,
    "live QA paid:false is preserved (not rewritten)",
  );
  assertEqual(
    liveQa.data?.payments[0]?.status,
    "pending",
    "live QA pending status is preserved",
  );

  const wrapperEmpty = parseOrderCreateResponse(200, {
    success: true,
    payments: [],
    data: {
      order_id: "ord-inner",
      payments: [
        {
          payment_type: "card",
          client_secret: "pi_inner_secret",
          payment_intent_id: "pi_inner",
        },
      ],
    },
  });
  assertEqual(
    wrapperEmpty.data?.order_id,
    "ord-inner",
    "picks the layer with order_id over wrapper payments: []",
  );
  assertEqual(
    wrapperEmpty.data?.client_secret,
    "pi_inner_secret",
    "secret comes from the inner payments row",
  );

  const liveExactText = JSON.stringify({
    success: true,
    client_secret: "pi_3LiveExact_secret_wire",
    clientSecret: "pi_3LiveExact_secret_wire",
    payments: [
      {
        payment_type: "card",
        paid: false,
        status: "pending",
        payment_status: "unpaid",
        client_secret: "pi_3LiveExact_secret_wire",
        clientSecret: "pi_3LiveExact_secret_wire",
        payment_intent: { client_secret: "pi_3LiveExact_secret_wire" },
      },
    ],
    data: {
      order_id: "ord-live-exact",
      client_secret: "pi_3LiveExact_secret_wire",
      payments: [
        {
          payment_type: "card",
          paid: false,
          status: "pending",
          payment_status: "unpaid",
          client_secret: "pi_3LiveExact_secret_wire",
          clientSecret: "pi_3LiveExact_secret_wire",
          payment_intent: { client_secret: "pi_3LiveExact_secret_wire" },
        },
      ],
    },
  });
  const liveExact = parseOrderCreateResponse(200, liveExactText);
  assertEqual(liveExact.success, true, "exact live 200 text is a created order");
  assertEqual(liveExact.data?.order_id, "ord-live-exact", "exact live order id");
  assertEqual(
    liveExact.data?.client_secret,
    "pi_3LiveExact_secret_wire",
    "exact live client_secret survives unwrap",
  );
  assertEqual(
    liveExact.data?.payments[0]?.client_secret,
    "pi_3LiveExact_secret_wire",
    "exact live payments[0].client_secret survives unwrap",
  );
  assertEqual(
    liveExact.data?.payments[0]?.payment_status,
    "unpaid",
    "exact live payment_status unpaid is preserved",
  );
  assertEqual(
    typeof liveExact.raw,
    "string",
    "keeps raw response.text() beside the unwrapped data",
  );
}

run();
console.log("order-create-response.test.ts passed");
