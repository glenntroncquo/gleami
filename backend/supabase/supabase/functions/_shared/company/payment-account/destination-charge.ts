import { isCardChargesEnabled } from "./flags.ts";
import type { CompanyPaymentAccount } from "./entity.ts";

/**
 * Destination charges: platform is merchant of record (no `on_behalf_of`).
 * Funds transfer to the company's connected Express account.
 *
 * TODO: replace this 0-cent fee with a company/platform commission % when
 * product defines one. No fee column or setting exists on `company` or
 * `company_payment_account` today.
 */
export const PLATFORM_APPLICATION_FEE_AMOUNT_CENTS = 0;

export interface DestinationChargeCreateParams {
  transfer_data: {
    destination: string;
  };
  application_fee_amount: number;
}

/** Connected Stripe account that receives the destination transfer, or null. */
export function stripeDestinationAccountId(
  account:
    | Pick<CompanyPaymentAccount, "provider" | "providerAccountId" | "chargesEnabled">
    | null
    | undefined,
): string | null {
  if (!account || !isCardChargesEnabled(account)) {
    return null;
  }
  if (account.provider !== "stripe" || !account.providerAccountId) {
    return null;
  }
  return account.providerAccountId;
}

export function applicationFeeAmountCents(_chargeAmountCents: number): number {
  // TODO: compute from company/platform commission % when product defines it.
  return PLATFORM_APPLICATION_FEE_AMOUNT_CENTS;
}

export function destinationChargeCreateParams(
  destinationAccountId: string,
  chargeAmountCents: number,
): DestinationChargeCreateParams {
  return {
    transfer_data: {
      destination: destinationAccountId,
    },
    application_fee_amount: applicationFeeAmountCents(chargeAmountCents),
  };
}
