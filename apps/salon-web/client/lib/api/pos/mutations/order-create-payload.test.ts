import {
  buildOrderCreateHttpBody,
  type CreateOrderWithPaymentV3Request,
} from "./order-create-payload";

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
  const request: CreateOrderWithPaymentV3Request = {
    company_id: "co-1",
    date: "not-used-raw",
    appointment_id: "appt-1",
    client_id: "client-1",
    treatments: [
      {
        appointment_segment_id: "seg-1",
        service_id: "svc-1",
        service_variant_id: "var-1",
        quantity: 1,
        unit_price: 50,
        vat_rate: 21,
        discount_amount: 0,
      },
    ],
    products: [
      {
        product_id: "prod-1",
        quantity: 2,
        unit_price: 10,
        vat_rate: 21,
        discount_amount: 0,
      },
    ],
    payments: [{ payment_type: "cash", amount: 70, paid: true }],
    currency: "eur",
  };

  const body = buildOrderCreateHttpBody(request, "2026-09-01T08:00:00.000Z");

  assertEqual(
    Object.prototype.hasOwnProperty.call(body, "services"),
    false,
    "HTTP body must not include a services key",
  );
  assertEqual(
    Array.isArray(body.treatments) && body.treatments.length === 1,
    true,
    "HTTP body includes treatments from appointment/cart service lines",
  );
  assertEqual(
    body.treatments?.[0],
    {
      appointment_segment_id: "seg-1",
      service_id: "svc-1",
      service_variant_id: "var-1",
      quantity: 1,
      unit_price: 50,
      vat_rate: 21,
      discount_amount: 0,
    },
    "treatment lines use service_id / service_variant_id",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(body.treatments?.[0] || {}, "treatment_id"),
    false,
    "treatment lines must not use leftover treatment_id",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(
      body.treatments?.[0] || {},
      "price_option_id",
    ),
    false,
    "treatment lines must not use leftover price_option_id",
  );
  assertEqual(body.products?.length, 1, "HTTP body includes product lines");
  assertEqual(body.appointment_id, "appt-1", "appointment_id is forwarded");
  assertEqual(body.date, "2026-09-01T08:00:00.000Z", "normalized date is used");

  const emptyTreatments = buildOrderCreateHttpBody(
    {
      company_id: "co-1",
      date: "raw",
      treatments: [],
      products: [
        {
          product_id: "prod-1",
          quantity: 1,
          unit_price: 10,
        },
      ],
      payments: [{ payment_type: "cash", amount: 10, paid: true }],
    },
    "2026-09-01T08:00:00.000Z",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(emptyTreatments, "treatments"),
    false,
    "omit empty treatments array",
  );
  assertEqual(
    Object.prototype.hasOwnProperty.call(emptyTreatments, "services"),
    false,
    "empty treatments must not fall back to a services key",
  );
}

run();
console.log("order-create-payload.test.ts passed");
