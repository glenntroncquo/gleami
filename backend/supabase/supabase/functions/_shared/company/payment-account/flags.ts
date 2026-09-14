import type { CompanyPaymentAccount } from "./entity.ts";

/** Single source of truth: card PaymentIntents require charges_enabled = true. */
export function isCardChargesEnabled(
  account: Pick<CompanyPaymentAccount, "chargesEnabled"> | null | undefined,
): boolean {
  return account?.chargesEnabled === true;
}

/** Map provider account flags. Stripe Account uses these same boolean names. */
export function providerAccountFlags(account: {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
}): {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} {
  return {
    chargesEnabled: account.charges_enabled === true,
    payoutsEnabled: account.payouts_enabled === true,
    detailsSubmitted: account.details_submitted === true,
  };
}

export type ConnectAccountLinkType = "account_onboarding" | "account_update";

/**
 * Choose Account Link type from live Stripe account flags.
 *
 * Do not pick `account_update` solely because `details_submitted` is true.
 * Express accounts can submit details while charges/payouts stay disabled
 * and requirements remain due — Stripe then only accepts `account_onboarding`.
 *
 * Later updates use `account_update` only after first-time onboarding is
 * complete: charges_enabled && details_submitted.
 */
export function accountLinkType(account: {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled?: boolean;
}): ConnectAccountLinkType {
  if (account.chargesEnabled === true && account.detailsSubmitted === true) {
    return "account_update";
  }
  return "account_onboarding";
}

/** Stripe rejected `account_update` — this account still needs onboarding. */
export function isAccountUpdateLinkNotValidError(message: string): boolean {
  return (
    /cannot create `account_update` type Account Links/i.test(message) ||
    /Valid types for this account are \["account_onboarding"\]/i.test(message)
  );
}

/**
 * Express account language preference. Account Links reject `locale`;
 * hosted onboarding has no locale param — set Dutch on the account instead.
 */
export const connectPreferredLocales = ["nl"] as const;

/**
 * Accounts v1 controller hash that matches classic Express.
 * Clover (`2025-10-29` / `2025-11-17`) rejects `type: "express"`.
 */
export const expressAccountController = {
  fees: { payer: "application" as const },
  losses: { payments: "application" as const },
  stripe_dashboard: { type: "express" as const },
};

/** Express country is immutable after create. Prefer ISO-2; default BE. */
export function connectAccountCountry(companyCountry: string | null | undefined): string {
  const raw = companyCountry?.trim() ?? "";
  if (/^[A-Za-z]{2}$/.test(raw)) {
    return raw.toUpperCase();
  }

  const aliases: Record<string, string> = {
    belgium: "BE",
    belgie: "BE",
    belgië: "BE",
    netherlands: "NL",
    nederland: "NL",
    france: "FR",
    germany: "DE",
    deutschland: "DE",
  };

  return aliases[raw.toLowerCase()] ?? "BE";
}
