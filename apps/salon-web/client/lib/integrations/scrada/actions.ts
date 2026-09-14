"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveCompanyIdFromMembership } from "@/lib/auth";

const SCRADA_INTEGRATION_TYPE = "scrada";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ScradaPaymentMethodMap = {
  cash: string;
  card: string;
  bank_transfer: string;
  invoice: string;
};

export type ScradaIntegration = {
  active: boolean;
  externalCompanyId: string;
  hasApiKey: boolean;
  hasApiPassword: boolean;
  language: string;
  journalId: string;
  categoryId: string;
  vatTypeId: string;
  vatPercentage: string;
  paymentMethodMap: ScradaPaymentMethodMap;
};

export type SaveScradaIntegrationInput = {
  active: boolean;
  externalCompanyId: string;
  apiKey: string;
  apiPassword: string;
  language: string;
  journalId: string;
  categoryId: string;
  vatTypeId: string;
  vatPercentage: string;
  paymentMethodMap: ScradaPaymentMethodMap;
};

const emptyIntegration: ScradaIntegration = {
  active: false,
  externalCompanyId: "",
  hasApiKey: false,
  hasApiPassword: false,
  language: "NL",
  journalId: "",
  categoryId: "",
  vatTypeId: "",
  vatPercentage: "",
  paymentMethodMap: { cash: "", card: "", bank_transfer: "", invoice: "" },
};

async function getAuthenticatedCompanyId(
  supabase: SupabaseServerClient
): Promise<{ companyId: string } | { error: string }> {
  return resolveCompanyIdFromMembership(supabase);
}

/**
 * Read the Scrada integration for the authenticated user's company.
 * Never returns the raw api_key/api_password — only whether they're set —
 * so credentials are never sent to the browser.
 */
export async function getScradaIntegration(): Promise<
  | { success: true; data: ScradaIntegration }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const auth = await getAuthenticatedCompanyId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data, error } = await supabase
    .from("company_integrations")
    .select("api_key, api_password, external_company_id, config, active")
    .eq("company_id", auth.companyId)
    .eq("integration_type", SCRADA_INTEGRATION_TYPE)
    .maybeSingle();

  if (error) {
    console.error("Failed to read Scrada integration:", error);
    return { success: false, error: "Could not load Scrada settings" };
  }

  if (!data) {
    return { success: true, data: emptyIntegration };
  }

  const config = (data.config as Record<string, unknown> | null) ?? {};
  const rawMap =
    (config.payment_method_map as Record<string, string> | undefined) ?? {};

  return {
    success: true,
    data: {
      active: data.active ?? false,
      externalCompanyId: data.external_company_id ?? "",
      hasApiKey: Boolean(data.api_key),
      hasApiPassword: Boolean(data.api_password),
      language: (config.language as string | undefined) ?? "NL",
      journalId: (config.journal_id as string | undefined) ?? "",
      categoryId: (config.category_id as string | undefined) ?? "",
      vatTypeId: (config.vat_type_id as string | undefined) ?? "",
      vatPercentage:
        config.vat_percentage !== undefined && config.vat_percentage !== null
          ? String(config.vat_percentage)
          : "",
      paymentMethodMap: {
        cash: rawMap.cash ?? "",
        card: rawMap.card ?? "",
        bank_transfer: rawMap.bank_transfer ?? "",
        invoice: rawMap.invoice ?? "",
      },
    },
  };
}

/**
 * Persist Scrada settings for the authenticated user's company.
 *
 * - Resolves the company from the authenticated user (not the client) so a
 *   caller cannot write to another company's row.
 * - `apiKey`/`apiPassword` are write-only: an empty value leaves the
 *   currently stored credential untouched instead of clearing it.
 */
export async function saveScradaIntegration(
  input: SaveScradaIntegrationInput
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const auth = await getAuthenticatedCompanyId(supabase);
  if ("error" in auth) return { success: false, error: auth.error };

  const { data: existing, error: readError } = await supabase
    .from("company_integrations")
    .select("id, config")
    .eq("company_id", auth.companyId)
    .eq("integration_type", SCRADA_INTEGRATION_TYPE)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read Scrada integration for save:", readError);
    return { success: false, error: "Could not load existing settings" };
  }

  const existingConfig =
    (existing?.config as Record<string, unknown> | null) ?? {};
  const vatPercentage = input.vatPercentage.trim();

  const mergedConfig = {
    ...existingConfig,
    language: input.language.trim() || null,
    journal_id: input.journalId.trim() || null,
    category_id: input.categoryId.trim() || null,
    vat_type_id: input.vatTypeId.trim() || null,
    vat_percentage: vatPercentage ? Number(vatPercentage) : null,
    payment_method_map: {
      cash: input.paymentMethodMap.cash.trim() || undefined,
      card: input.paymentMethodMap.card.trim() || undefined,
      bank_transfer: input.paymentMethodMap.bank_transfer.trim() || undefined,
      invoice: input.paymentMethodMap.invoice.trim() || undefined,
    },
  };

  const payload: Record<string, unknown> = {
    external_company_id: input.externalCompanyId.trim() || null,
    active: input.active,
    config: mergedConfig,
  };

  // Write-only credentials: only overwrite when the user typed a new value.
  if (input.apiKey.trim()) payload.api_key = input.apiKey.trim();
  if (input.apiPassword.trim()) payload.api_password = input.apiPassword.trim();

  if (existing) {
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) {
      console.error("Failed to update Scrada integration:", updateError);
      return { success: false, error: "Could not save Scrada settings" };
    }
  } else {
    const { error: insertError } = await supabase
      .from("company_integrations")
      .insert({
        company_id: auth.companyId,
        integration_type: SCRADA_INTEGRATION_TYPE,
        ...payload,
      });

    if (insertError) {
      console.error("Failed to create Scrada integration:", insertError);
      return { success: false, error: "Could not save Scrada settings" };
    }
  }

  return { success: true };
}
