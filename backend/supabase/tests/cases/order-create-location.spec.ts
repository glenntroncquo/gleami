import { describe, expect, it } from "vitest";
import { pickLocationId } from "../../supabase/functions/_shared/location/id.ts";
import { toAppointment } from "../../supabase/functions/_shared/appointment/mapper.ts";
import { resolveCreateOrderLocationId } from "../../supabase/functions/_shared/order/commands/create-with-payment/location.ts";
import { toOrder, toOrderItem, toPayment } from "../../supabase/functions/_shared/order/mapper.ts";

const locationId = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";
const companyId = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const now = "2026-09-05T21:00:00.000Z";

describe("POS order-create location_id (walk-in primary)", () => {
  const otherLocationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("reads snake_case location_id from a walk-in body with no appointment_id", () => {
    expect(pickLocationId({ location_id: locationId })).toBe(locationId);
  });

  it("still accepts optional camelCase locationId", () => {
    expect(pickLocationId({ locationId })).toBe(locationId);
  });

  it("uses body location_id even when an appointment location exists", () => {
    expect(resolveCreateOrderLocationId(locationId, otherLocationId)).toBe(locationId);
  });

  it("falls back to appointment location only when body omits location_id", () => {
    expect(resolveCreateOrderLocationId(undefined, locationId)).toBe(locationId);
  });

  it("leaves location unresolved when walk-in omits location_id (resolveBookingLocation then uses the primary)", () => {
    expect(resolveCreateOrderLocationId(undefined, undefined)).toBeUndefined();
  });
});

describe("domain mappers keep locationId for POS create", () => {
  it("copies appointment.location_id so checkout can inherit it", () => {
    const appointment = toAppointment({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      company_id: companyId,
      client_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      staff_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      location_id: locationId,
      price: 0,
      start: now,
      end: now,
      allow_overlap: false,
      status: "booked",
      is_canceled: false,
      cancel_reason: null,
      canceled_by: null,
      client_email: null,
      notes: null,
      staff_notes: null,
      image_path: null,
      staff_image_path: null,
      external_reference_id: null,
      confirmation_sent: false,
      send_confirmation: true,
      reminder_sent: false,
      created_at: now,
      updated_at: now,
    } as Parameters<typeof toAppointment>[0]);

    expect(appointment.locationId).toBe(locationId);
  });

  it("maps location_id on order, order_item, and payment", () => {
    expect(
      toOrder({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        company_id: companyId,
        client_id: null,
        location_id: locationId,
        order_number: "ORD-TEST01",
        date: now,
        status: "pending",
        payment_status: "unpaid",
        subtotal: 10,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 10,
        amount_paid: 0,
        notes: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      } as Parameters<typeof toOrder>[0]).locationId,
    ).toBe(locationId);

    expect(
      toOrderItem({
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        company_id: companyId,
        order_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        location_id: locationId,
        product_id: "11111111-1111-4111-8111-111111111111",
        service_id: null,
        service_variant_id: null,
        treatment_id: null,
        price_option_id: null,
        appointment_id: null,
        appointment_segment_id: null,
        quantity: 1,
        unit_price: 10,
        discount_amount: 0,
        vat_rate: 0,
        total: 10,
        created_at: now,
        updated_at: now,
      } as Parameters<typeof toOrderItem>[0]).locationId,
    ).toBe(locationId);

    expect(
      toPayment({
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        company_id: companyId,
        order_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        location_id: locationId,
        cashbook_id: null,
        amount: 10,
        amount_gross: 10,
        total_cash_received: null,
        payment_method: "cash",
        payment_provider: "cash",
        payment_status: "paid",
        status: "succeeded",
        card_brand: null,
        card_type: null,
        last_four_digits: null,
        processor_ref: null,
        provider_charge_id: null,
        provider_payment_intent_id: null,
        provider_refund_id: null,
        notes: null,
        paid_at: now,
        created_at: now,
        updated_at: now,
      } as Parameters<typeof toPayment>[0]).locationId,
    ).toBe(locationId);
  });
});
