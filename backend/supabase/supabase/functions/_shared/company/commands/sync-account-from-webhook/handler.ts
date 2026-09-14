import type Stripe from "stripe";
import { companyPaymentAccountRepository } from "../../payment-account/repository.ts";
import { providerAccountFlags } from "../../payment-account/flags.ts";

export type AccountUpdatedOutcome =
  | {
    outcome: "account_updated";
    companyId: string;
    provider: string;
    providerAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  }
  | { outcome: "account_not_found"; providerAccountId: string };

export async function handleAccountUpdatedEvent(
  event: Stripe.Event,
): Promise<AccountUpdatedOutcome> {
  const stripeAccount = event.data.object as Stripe.Account;
  const flags = providerAccountFlags(stripeAccount);
  const updated = await companyPaymentAccountRepository.updateFlags(stripeAccount.id, flags);

  if (!updated) {
    return { outcome: "account_not_found", providerAccountId: stripeAccount.id };
  }

  return {
    outcome: "account_updated",
    companyId: updated.companyId,
    provider: updated.provider,
    providerAccountId: updated.providerAccountId,
    chargesEnabled: updated.chargesEnabled,
    payoutsEnabled: updated.payoutsEnabled,
    detailsSubmitted: updated.detailsSubmitted,
  };
}
