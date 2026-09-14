/**
 * Helpers for building the booking widget iframe URL and deriving its origin.
 * Framework-agnostic; safe on client and server.
 */

const DEFAULT_WIDGET_DOMAIN = "https://booking-widget-nine.vercel.app";

/** The configured widget domain (no trailing slash). */
export function getWidgetDomain(): string {
  const domain =
    process.env.NEXT_PUBLIC_WIDGET_DOMAIN?.trim() || DEFAULT_WIDGET_DOMAIN;
  return domain.replace(/\/+$/, "");
}

/**
 * The widget's real origin, used as the postMessage target origin in
 * production. Falls back to "*" only if the domain can't be parsed.
 */
export function getWidgetOrigin(): string {
  try {
    return new URL(getWidgetDomain()).origin;
  } catch {
    return "*";
  }
}

export type BuildWidgetUrlParams = {
  companyId: string;
  supabaseUrl: string;
  supabaseKey: string;
  staffIds?: string[];
};

/** Build the full `${domain}/widget?...` URL with the required query params. */
export function buildWidgetUrl({
  companyId,
  supabaseUrl,
  supabaseKey,
  staffIds,
}: BuildWidgetUrlParams): string {
  const url = new URL(`${getWidgetDomain()}/widget`);
  url.searchParams.set("companyId", companyId);
  url.searchParams.set("supabaseUrl", supabaseUrl);
  url.searchParams.set("supabaseKey", supabaseKey);
  if (staffIds && staffIds.length > 0) {
    url.searchParams.set("staffIds", staffIds.join(","));
  }
  return url.toString();
}
