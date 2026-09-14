import { createClient } from "@/lib/supabase/server";
import { sanitizeTheme, type WidgetTheme } from "./theme";

const BOOKING_INTEGRATION_TYPE = "booking";

export type BookingIntegrationRow = {
  id: string;
  config: Record<string, unknown> | null;
};

/**
 * Read the raw booking integration row (id + config) for a company.
 * Returns null when the company has no booking integration row yet.
 */
export async function getBookingIntegration(
  companyId: string
): Promise<BookingIntegrationRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_integrations")
    .select("id, config")
    .eq("company_id", companyId)
    .eq("integration_type", BOOKING_INTEGRATION_TYPE)
    .maybeSingle();

  if (error) {
    console.error("Failed to read booking integration:", error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    config: (data.config as Record<string, unknown> | null) ?? null,
  };
}

/**
 * Read the booking widget theme for a company, falling back to defaults for
 * any missing/invalid key (and for companies with no config at all).
 */
export async function getWidgetTheme(companyId: string): Promise<WidgetTheme> {
  const integration = await getBookingIntegration(companyId);
  const styles =
    integration?.config && typeof integration.config === "object"
      ? (integration.config as Record<string, unknown>).styles
      : undefined;
  return sanitizeTheme(styles);
}
