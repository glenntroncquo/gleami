"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveCompanyIdFromMembership } from "@/lib/auth";

const TIMETREE_INTEGRATION_TYPE = "timetree";

export type SaveTimeTreeIntegrationInput = {
  calendarId: string;
  active: boolean;
};

/**
 * Persist the TimeTree calendar id for the authenticated user's company.
 * Resolves the company from company_membership / permission RPCs (not JWT
 * app_metadata or a client-supplied id) so a caller cannot write to
 * another company's row.
 */
export async function saveTimeTreeIntegration(
  input: SaveTimeTreeIntegrationInput
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();

  const auth = await resolveCompanyIdFromMembership(supabase);
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }
  const companyId = auth.companyId;

  const { data: existing, error: readError } = await supabase
    .from("company_integrations")
    .select("id, config")
    .eq("company_id", companyId)
    .eq("integration_type", TIMETREE_INTEGRATION_TYPE)
    .maybeSingle();

  if (readError) {
    console.error("Failed to read TimeTree integration for save:", readError);
    return { success: false, error: "Could not load existing settings" };
  }

  const existingConfig =
    (existing?.config as Record<string, unknown> | null) ?? {};

  const mergedConfig = {
    ...existingConfig,
    calendar_id: input.calendarId.trim() || null,
  };

  if (existing) {
    const { error: updateError } = await supabase
      .from("company_integrations")
      .update({ config: mergedConfig, active: input.active })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Failed to update TimeTree integration:", updateError);
      return { success: false, error: "Could not save TimeTree settings" };
    }
  } else {
    const { error: insertError } = await supabase
      .from("company_integrations")
      .insert({
        company_id: companyId,
        integration_type: TIMETREE_INTEGRATION_TYPE,
        config: mergedConfig,
        active: input.active,
      });

    if (insertError) {
      console.error("Failed to create TimeTree integration:", insertError);
      return { success: false, error: "Could not save TimeTree settings" };
    }
  }

  return { success: true };
}
