import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase-types";

export const TRANSLATION_LOCALES = ["nl", "fr", "de", "en", "pt"] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export const TRANSLATION_LABELS: Record<TranslationLocale, string> = {
  nl: "Nederlands",
  fr: "Français",
  de: "Deutsch",
  en: "English",
  pt: "Português",
};

export type ServiceTranslationFields = Record<
  TranslationLocale,
  { name: string; description: string }
>;

export type VariantTranslationFields = Record<TranslationLocale, string>;

type Db = SupabaseClient<Database>;

export function emptyServiceTranslations(): ServiceTranslationFields {
  return {
    nl: { name: "", description: "" },
    fr: { name: "", description: "" },
    de: { name: "", description: "" },
    en: { name: "", description: "" },
    pt: { name: "", description: "" },
  };
}

export function emptyVariantTranslations(): VariantTranslationFields {
  return { nl: "", fr: "", de: "", en: "", pt: "" };
}

export async function loadServiceTranslations(
  supabase: Db,
  serviceId: string,
  variantIds: string[],
): Promise<{
  service: ServiceTranslationFields;
  variants: Record<string, VariantTranslationFields>;
}> {
  const service = emptyServiceTranslations();
  const variants: Record<string, VariantTranslationFields> = {};
  for (const id of variantIds) variants[id] = emptyVariantTranslations();

  const [{ data: serviceRows, error: serviceError }, variantResult] = await Promise.all([
    supabase.from("service_translation").select("locale, name, description").eq("service_id", serviceId),
    variantIds.length > 0
      ? supabase
          .from("service_variant_translation")
          .select("service_variant_id, locale, name")
          .in("service_variant_id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (serviceError) throw serviceError;
  if (variantResult.error) throw variantResult.error;

  for (const row of serviceRows ?? []) {
    if (!isLocale(row.locale)) continue;
    service[row.locale] = {
      name: row.name ?? "",
      description: row.description ?? "",
    };
  }
  for (const row of variantResult.data ?? []) {
    if (!isLocale(row.locale)) continue;
    const current = variants[row.service_variant_id] ?? emptyVariantTranslations();
    current[row.locale] = row.name ?? "";
    variants[row.service_variant_id] = current;
  }
  return { service, variants };
}

export async function saveServiceTranslations(
  supabase: Db,
  serviceId: string,
  fields: ServiceTranslationFields,
): Promise<{ error: string | null }> {
  for (const locale of TRANSLATION_LOCALES) {
    const name = fields[locale].name.trim();
    const description = fields[locale].description.trim();
    if (!name) {
      const { error } = await supabase
        .from("service_translation")
        .delete()
        .eq("service_id", serviceId)
        .eq("locale", locale);
      if (error) return { error: error.message };
      continue;
    }
    const { error } = await supabase.from("service_translation").upsert(
      {
        service_id: serviceId,
        locale,
        name,
        description: description || null,
      },
      { onConflict: "service_id,locale" },
    );
    if (error) return { error: error.message };
  }
  return { error: null };
}

export async function saveVariantTranslations(
  supabase: Db,
  variantId: string,
  fields: VariantTranslationFields,
): Promise<{ error: string | null }> {
  for (const locale of TRANSLATION_LOCALES) {
    const name = fields[locale].trim();
    if (!name) {
      const { error } = await supabase
        .from("service_variant_translation")
        .delete()
        .eq("service_variant_id", variantId)
        .eq("locale", locale);
      if (error) return { error: error.message };
      continue;
    }
    const { error } = await supabase.from("service_variant_translation").upsert(
      { service_variant_id: variantId, locale, name },
      { onConflict: "service_variant_id,locale" },
    );
    if (error) return { error: error.message };
  }
  return { error: null };
}

function isLocale(value: string): value is TranslationLocale {
  return (TRANSLATION_LOCALES as readonly string[]).includes(value);
}
