"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveCompanyIdFromMembership } from "@/lib/auth";
import {
  pickValidTheme,
  WIDGET_THEME_KEYS,
  type WidgetTheme,
} from "./theme";

const BOOKING_INTEGRATION_TYPE = "booking";

export type SaveWidgetThemeResult =
  | { success: true; theme: WidgetTheme }
  | { success: false; error: string };

/**
 * Persist the booking widget theme to `company_integrations.config.styles`.
 *
 * - Resolves the company from company_membership / permission RPCs (not
 *   JWT app_metadata or a client-supplied id) so a caller cannot write
 *   to another company's row.
 * - Validates every color server-side; invalid values are rejected outright.
 * - Read-merge-write: preserves sibling keys in `config` and only updates
 *   the `styles` object's provided keys.
 */
export async function saveWidgetTheme(
  theme: unknown
): Promise<SaveWidgetThemeResult> {
  const supabase = await createClient();

  const auth = await resolveCompanyIdFromMembership(supabase);
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }
  const companyId = auth.companyId;

  // Validate server-side: only valid hex colors survive.
  const validTheme = pickValidTheme(theme);
  if (Object.keys(validTheme).length !== WIDGET_THEME_KEYS.length) {
    return { success: false, error: "One or more colors are invalid" };
  }

  // Read existing config so we can merge rather than overwrite siblings.
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
    styles: {
      ...existingStyles,
      ...validTheme,
    },
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
