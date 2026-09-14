import { describe, expect, it } from "vitest";
import {
  accountLinkType,
  connectAccountCountry,
  connectPreferredLocales,
  expressAccountController,
  isAccountUpdateLinkNotValidError,
  isCardChargesEnabled,
  providerAccountFlags,
} from "../../supabase/functions/_shared/company/payment-account/flags.ts";
import {
  applicationFeeAmountCents,
  destinationChargeCreateParams,
  PLATFORM_APPLICATION_FEE_AMOUNT_CENTS,
  stripeDestinationAccountId,
} from "../../supabase/functions/_shared/company/payment-account/destination-charge.ts";
import { toPayment } from "../../supabase/functions/_shared/order/mapper.ts";

const now = "2026-09-06T09:00:00.000Z";
const companyId = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";
const locationId = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";

describe("Connect account flags", () => {
  it("allows card charges only when charges_enabled is true", () => {
    expect(isCardChargesEnabled(null)).toBe(false);
    expect(isCardChargesEnabled(undefined)).toBe(false);
    expect(isCardChargesEnabled({ chargesEnabled: false })).toBe(false);
    expect(isCardChargesEnabled({ chargesEnabled: true })).toBe(true);
  });

  it("mirrors provider account booleans without trusting details_submitted alone", () => {
    expect(
      providerAccountFlags({
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: true,
      }),
    ).toEqual({
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: true,
    });

    expect(
      providerAccountFlags({
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
      }),
    ).toEqual({
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
  });

  it("keeps account_onboarding while charges are disabled even if details look submitted", () => {
    expect(
      accountLinkType({
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      }),
    ).toBe("account_onboarding");

    // Live Express (Glenn / acct_1UCit5…): details submitted, charges+payouts still off.
    expect(
      accountLinkType({
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: true,
      }),
    ).toBe("account_onboarding");

    expect(
      accountLinkType({
        chargesEnabled: true,
        payoutsEnabled: false,
        detailsSubmitted: false,
      }),
    ).toBe("account_onboarding");

    expect(
      accountLinkType({
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
      }),
    ).toBe("account_update");
  });

  it("detects Stripe rejecting account_update in favor of onboarding", () => {
    expect(
      isAccountUpdateLinkNotValidError(
        'You cannot create `account_update` type Account Links for this account. Valid types for this account are ["account_onboarding"].',
      ),
    ).toBe(true);
    expect(isAccountUpdateLinkNotValidError("Invalid account")).toBe(false);
  });

  it("prefers Dutch on the Express account, not Account Link locale", () => {
    expect(connectPreferredLocales).toEqual(["nl"]);
  });

  it("normalizes company country to an ISO-2 Express country", () => {
    expect(connectAccountCountry("BE")).toBe("BE");
    expect(connectAccountCountry("be")).toBe("BE");
    expect(connectAccountCountry("Belgium")).toBe("BE");
    expect(connectAccountCountry(null)).toBe("BE");
    expect(connectAccountCountry("Netherlands")).toBe("NL");
  });

  it("uses the clover Accounts v1 controller hash instead of type=express", () => {
    expect(expressAccountController).toEqual({
      fees: { payer: "application" },
      losses: { payments: "application" },
      stripe_dashboard: { type: "express" },
    });
  });
});

describe("destination charges (Phase 2)", () => {
  it("requires charges_enabled and provider=stripe for a destination account", () => {
    expect(stripeDestinationAccountId(null)).toBeNull();
    expect(
      stripeDestinationAccountId({
        provider: "stripe",
        providerAccountId: "acct_enabled",
        chargesEnabled: false,
      }),
    ).toBeNull();
    expect(
      stripeDestinationAccountId({
        provider: "mollie",
        providerAccountId: "org_xxx",
        chargesEnabled: true,
      }),
    ).toBeNull();
    expect(
      stripeDestinationAccountId({
        provider: "stripe",
        providerAccountId: "acct_live",
        chargesEnabled: true,
      }),
    ).toBe("acct_live");
  });

  it("sets transfer_data.destination and a present 0-cent application fee", () => {
    expect(PLATFORM_APPLICATION_FEE_AMOUNT_CENTS).toBe(0);
    expect(applicationFeeAmountCents(1250)).toBe(0);
    expect(destinationChargeCreateParams("acct_dest", 1250)).toEqual({
      transfer_data: { destination: "acct_dest" },
      application_fee_amount: 0,
    });
  });
});

describe("payment mapper provider_* ids", () => {
  it("reads the neutralized provider columns", () => {
    const payment = toPayment({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      company_id: companyId,
      order_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      location_id: locationId,
      cashbook_id: null,
      amount: 10,
      amount_gross: 10,
      total_cash_received: null,
      payment_method: "card",
      payment_provider: "stripe",
      payment_status: "paid",
      status: "succeeded",
      card_brand: null,
      card_type: null,
      last_four_digits: null,
      processor_ref: null,
      provider_charge_id: "ch_test_charge",
      provider_payment_intent_id: "pi_test_intent",
      provider_refund_id: "re_test_refund",
      notes: null,
      paid_at: now,
      created_at: now,
      updated_at: now,
    } as Parameters<typeof toPayment>[0]);

    expect(payment.providerChargeId).toBe("ch_test_charge");
    expect(payment.providerPaymentIntentId).toBe("pi_test_intent");
    expect(payment.providerRefundId).toBe("re_test_refund");
  });
});
