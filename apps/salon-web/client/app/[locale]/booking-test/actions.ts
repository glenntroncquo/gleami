"use server";

import { createClient } from "@/lib/supabase/server";
import {
  pickValidTheme,
  WIDGET_THEME_KEYS,
  type WidgetTheme,
} from "@/lib/booking-widget/theme";

const BOOKING_INTEGRATION_TYPE = "booking";

/**
 * Test-only save path for the /booking-test page. Unlike the production
 * `saveWidgetTheme` action (which resolves the company from the authenticated
 * user), this targets an explicit company id so the local test page can be
 * exercised against the hardcoded test company.
 *
 * Still validates colors server-side and performs a read-merge-write to
 * preserve sibling keys in `config`.
 */
export async function saveWidgetThemeForCompany(
  companyId: string,
  theme: unknown
): Promise<{ success: true; theme: WidgetTheme } | { success: false; error: string }> {
  const supabase = await createClient();

  const validTheme = pickValidTheme(theme);
  if (Object.keys(validTheme).length !== WIDGET_THEME_KEYS.length) {
    return { success: false, error: "One or more colors are invalid" };
  }

  const { data: existing, error: readError } = await supabase
    .from("company_integrations")
    .select("id, config")
    .eq("company_id", companyId)
    .eq("integration_type", BOOKING_INTEGRATION_TYPE)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read booking integration for save:", readError);
    return { success: false, error: "Could not load existing settings" };
  }

  const existingConfig =
    existing?.config && typeof existing.config === "object"
      ? (existing.config as Record<string, unknown>)
      : {};
  const existingStyles =
    existingConfig.styles && typeof existingConfig.styles === "object"
      ? (existingConfig.styles as Record<string, unknown>)
      : {};

  const mergedConfig = {
    ...existingConfig,
    styles: { ...existingStyles, ...validTheme },
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ config: mergedConfig })
      .eq("id", existing.id);
    if (updateError) {
      console.error("Failed to update booking integration:", updateError);
      return { success: false, error: "Could not save settings" };
    }
  } else {
    const { error: insertError } = await supabase
      .from("company_integrations")
      .insert({
        company_id: companyId,
        integration_type: BOOKING_INTEGRATION_TYPE,
        config: mergedConfig,
        active: true,
      });
    if (insertError) {
      console.error("Failed to create booking integration:", insertError);
      return { success: false, error: "Could not save settings" };
    }
  }

  return { success: true, theme: validTheme as WidgetTheme };
}
