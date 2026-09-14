/**
 * Embed contract for glenntroncquo/booking-widget.
 *
 * This public site does not query booking-domain tables. Catalog, availability,
 * and appointment_segment writes live in the widget. The iframe URL and
 * postMessage types below are the only coupling.
 */

export const DEFAULT_WIDGET_DOMAIN = "https://booking-widget-nine.vercel.app";

export const WIDGET_READY_EVENT = "salonify-widget-ready";
export const WIDGET_THEME_EVENT = "widget-theme";

export type WidgetTheme = {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  text: string;
  background: string;
  buttonText: string;
};

export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  primary: "#FF8FB2",
  primaryHover: "#FFBDD4",
  primaryLight: "#FFF0F7",
  secondary: "#FFBDD4",
  text: "#4A3F45",
  background: "white",
  buttonText: "white",
};

export type WidgetReadyMessage = {
  type: typeof WIDGET_READY_EVENT;
  source?: string;
};

export type WidgetThemeMessage = {
  type: typeof WIDGET_THEME_EVENT;
  theme: WidgetTheme;
};

/** Query params the widget currently reads, plus service/variant preselection for the segments API. */
export type WidgetEmbedParams = {
  companyId: string;
  staffIds?: string[];
  staffSlugs?: string[];
  serviceIds?: string[];
  serviceVariantIds?: string[];
};

export function getWidgetDomain(): string {
  return (
    process.env.NEXT_PUBLIC_WIDGET_DOMAIN?.replace(/\/$/, "") ||
    DEFAULT_WIDGET_DOMAIN
  );
}

function setListParam(
  params: URLSearchParams,
  key: string,
  values: string[] | undefined,
) {
  const list = (values ?? []).map((value) => value.trim()).filter(Boolean);
  if (list.length > 0) {
    params.set(key, list.join(","));
  }
}

export function buildWidgetUrl(
  widgetDomain: string,
  {
    companyId,
    staffIds,
    staffSlugs,
    serviceIds,
    serviceVariantIds,
  }: WidgetEmbedParams,
): string {
  const params = new URLSearchParams();
  params.set("companyId", companyId);
  setListParam(params, "staffIds", staffIds);
  setListParam(params, "staffSlugs", staffSlugs);
  setListParam(params, "serviceIds", serviceIds);
  setListParam(params, "serviceVariantIds", serviceVariantIds);
  return `${widgetDomain.replace(/\/$/, "")}/widget?${params.toString()}`;
}

export function isWidgetReadyMessage(
  data: unknown,
): data is WidgetReadyMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as WidgetReadyMessage).type === WIDGET_READY_EVENT
  );
}
