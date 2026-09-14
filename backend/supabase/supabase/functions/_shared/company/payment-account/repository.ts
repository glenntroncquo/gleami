import { supabaseAdmin } from "../../infrastructure/supabase/client.ts";
import { RepositoryError } from "../../infrastructure/errors.ts";
import { toCompanyPaymentAccount } from "./mapper.ts";
import type { CompanyPaymentAccount } from "./entity.ts";

export interface UpsertCompanyPaymentAccountParams {
  companyId: string;
  provider: string;
  providerAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export const companyPaymentAccountRepository = {
  async findByCompanyId(companyId: string): Promise<CompanyPaymentAccount | null> {
    const { data, error } = await supabaseAdmin
      .from("company_payment_account")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch company payment account", { cause: error });
    }

    return data ? toCompanyPaymentAccount(data) : null;
  },

  async findByProviderAccountId(
    providerAccountId: string,
  ): Promise<CompanyPaymentAccount | null> {
    const { data, error } = await supabaseAdmin
      .from("company_payment_account")
      .select("*")
      .eq("provider_account_id", providerAccountId)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch company payment account by provider id", {
        cause: error,
      });
    }

    return data ? toCompanyPaymentAccount(data) : null;
  },

  async upsert(params: UpsertCompanyPaymentAccountParams): Promise<CompanyPaymentAccount> {
    const { data, error } = await supabaseAdmin
      .from("company_payment_account")
      .upsert(
        {
          company_id: params.companyId,
          provider: params.provider,
          provider_account_id: params.providerAccountId,
          charges_enabled: params.chargesEnabled,
          payouts_enabled: params.payoutsEnabled,
          details_submitted: params.detailsSubmitted,
        },
        { onConflict: "company_id" },
      )
      .select()
      .single();

    if (error || !data) {
      throw new RepositoryError("Failed to upsert company payment account", { cause: error });
    }

    return toCompanyPaymentAccount(data);
  },

  async updateFlags(
    providerAccountId: string,
    flags: {
      chargesEnabled: boolean;
      payoutsEnabled: boolean;
      detailsSubmitted: boolean;
    },
  ): Promise<CompanyPaymentAccount | null> {
    const { data, error } = await supabaseAdmin
      .from("company_payment_account")
      .update({
        charges_enabled: flags.chargesEnabled,
        payouts_enabled: flags.payoutsEnabled,
        details_submitted: flags.detailsSubmitted,
      })
      .eq("provider_account_id", providerAccountId)
      .select()
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to update company payment account flags", {
        cause: error,
      });
    }

    return data ? toCompanyPaymentAccount(data) : null;
  },
};
