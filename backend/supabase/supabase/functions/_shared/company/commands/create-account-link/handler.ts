import Stripe from "stripe";
import { stripe } from "../../../infrastructure/stripe/client.ts";
import { companyRepository } from "../../repository.ts";
import { companyPaymentAccountRepository } from "../../payment-account/repository.ts";
import {
  accountLinkType,
  connectAccountCountry,
  connectPreferredLocales,
  expressAccountController,
  isAccountUpdateLinkNotValidError,
  providerAccountFlags,
} from "../../payment-account/flags.ts";
import type { CompanyPaymentAccount } from "../../payment-account/entity.ts";
import type { CreateAccountLinkInput } from "./schema.ts";

const STRIPE_PROVIDER = "stripe";

export interface AccountLinkResult {
  url: string;
  expiresAt: number;
  account: {
    provider: string;
    provider_account_id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  };
}

export type CreateAccountLinkOutcome =
  | { outcome: "success"; data: AccountLinkResult }
  | { outcome: "company_not_found" }
  | { outcome: "stripe_error"; message: string; statusCode: number; code?: string };

function toAccountDto(account: CompanyPaymentAccount) {
  return {
    provider: account.provider,
    provider_account_id: account.providerAccountId,
    charges_enabled: account.chargesEnabled,
    payouts_enabled: account.payoutsEnabled,
    details_submitted: account.detailsSubmitted,
  };
}

async function persistStripeAccount(
  companyId: string,
  stripeAccount: Stripe.Account,
): Promise<CompanyPaymentAccount> {
  const flags = providerAccountFlags(stripeAccount);
  return companyPaymentAccountRepository.upsert({
    companyId,
    provider: STRIPE_PROVIDER,
    providerAccountId: stripeAccount.id,
    ...flags,
  });
}

function isUnknownPreferredLocalesError(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeError &&
    /unknown parameter: preferred_locales/i.test(error.message)
  );
}

async function createConnectAccount(
  params: Stripe.AccountCreateParams,
): Promise<Stripe.Account> {
  const withLocales: Stripe.AccountCreateParams & {
    preferred_locales: readonly string[];
  } = {
    ...params,
    preferred_locales: connectPreferredLocales,
  };
  try {
    return await stripe.accounts.create(withLocales);
  } catch (error: unknown) {
    if (isUnknownPreferredLocalesError(error)) {
      console.error(
        "Stripe rejected preferred_locales on account create; retrying without it",
      );
      return await stripe.accounts.create(params);
    }
    throw error;
  }
}

async function createConnectAccountLink(
  params: Stripe.AccountLinkCreateParams,
): Promise<Stripe.AccountLink> {
  try {
    return await stripe.accountLinks.create(params);
  } catch (error: unknown) {
    if (
      params.type === "account_update" &&
      error instanceof Stripe.errors.StripeError &&
      isAccountUpdateLinkNotValidError(error.message)
    ) {
      console.error(
        "Stripe rejected account_update Account Link; retrying with account_onboarding",
        error.message,
        error.code,
      );
      return await stripe.accountLinks.create({
        ...params,
        type: "account_onboarding",
      });
    }
    throw error;
  }
}

/** Best-effort: do not block Account Link if Stripe rejects or locks this field. */
async function trySetPreferredLocales(accountId: string): Promise<Stripe.Account | null> {
  try {
    const params: Stripe.AccountUpdateParams & {
      preferred_locales: readonly string[];
    } = { preferred_locales: connectPreferredLocales };
    return await stripe.accounts.update(accountId, params);
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe preferred_locales update skipped:", error.message, error.code);
      return null;
    }
    throw error;
  }
}

export async function createAccountLinkHandler(
  input: CreateAccountLinkInput,
): Promise<CreateAccountLinkOutcome> {
  const company = await companyRepository.findById(input.company_id);
  if (!company) {
    return { outcome: "company_not_found" };
  }

  try {
    let stored = await companyPaymentAccountRepository.findByCompanyId(company.id);
    let stripeAccount: Stripe.Account;

    if (stored) {
      stripeAccount = await stripe.accounts.retrieve(stored.providerAccountId);
      const updated = await trySetPreferredLocales(stored.providerAccountId);
      stripeAccount = updated ?? stripeAccount;
      stored = await persistStripeAccount(company.id, stripeAccount);
    } else {
      stripeAccount = await createConnectAccount({
        controller: expressAccountController,
        country: connectAccountCountry(company.country),
        email: company.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          company_id: company.id,
        },
        business_profile: {
          name: company.name,
        },
      });
      stored = await persistStripeAccount(company.id, stripeAccount);
    }

    const link = await createConnectAccountLink({
      account: stored.providerAccountId,
      refresh_url: input.refresh_url,
      return_url: input.return_url,
      type: accountLinkType(providerAccountFlags(stripeAccount)),
    });

    return {
      outcome: "success",
      data: {
        url: link.url,
        expiresAt: link.expires_at,
        account: toAccountDto(stored),
      },
    };
  } catch (error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error("Stripe Account Link error:", error.message, error.code);
      return {
        outcome: "stripe_error",
        message: error.message,
        statusCode: error.statusCode || 400,
        code: error.code,
      };
    }

    throw error;
  }
}
