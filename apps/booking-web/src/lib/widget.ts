/**
 * Embed contract for glenntroncquo/booking-widget.
 *
 * This public site does not call booking edge functions. Catalog, availability,
 * and appointment writes live in the widget on the folded v1 slugs
 * (`service-list`, `availability-list`, `appointment-create` — not `*-v2`,
 * not `treatment-list`). The host may read `public.location` via existing anon
 * RLS for SEO / 404. The iframe URL and postMessage types below are the only
 * widget coupling.
 *
 * Deposit Checkout (Phase B `booking_hold`): the widget calls
 * `appointment-create`. When a deposit is due the response is a hold, not a
 * booking: `hold_id` + `checkout_url` + `hold_expires_at`/`expires_at` +
 * `status: hold_active` — **no `booking_id` until paid**. The widget
 * postMessages `salonify-checkout` (or `salonify-booking-event` / `checkout`)
 * with `checkout_url`. This host redirects the **top** window to Stripe
 * Checkout on that URL alone (hold fields optional; `booking_id` never
 * required). Success/cancel return here with `?deposit=success|cancel`.
 * Paid Checkout also appends `session_id={CHECKOUT_SESSION_ID}`.
 * The host injects `successUrl`/`cancelUrl` and snake_case
 * `success_url`/`cancel_url` on the iframe query and `widget-config`.
 * Stripe only returns to success_url after payment. The host forwards
 * `deposit=success` on the iframe so the widget shows the same Tot snel
 * + confetti as a normal book — no host interstitial, no hold poll.
 * Cancel keeps the soft-fail banner. The host never invokes
 * `appointment-create`. Deposit-off create still returns no
 * `checkout_url` and confirms in-widget.
 */

export const DEFAULT_WIDGET_DOMAIN = "https://booking-widget-nine.vercel.app";

export const WIDGET_READY_EVENT = "salonify-widget-ready";
export const WIDGET_THEME_EVENT = "widget-theme";
export const WIDGET_CONFIG_EVENT = "widget-config";
export const WIDGET_CHECKOUT_EVENT = "salonify-checkout";
export const WIDGET_BOOKING_EVENT = "salonify-booking-event";

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

export type WidgetConfigMessage = {
  type: typeof WIDGET_CONFIG_EVENT;
  config: {
    successUrl?: string;
    cancelUrl?: string;
    success_url?: string;
    cancel_url?: string;
    depositAmount?: number;
    depositEnabled?: boolean;
  };
};

export type WidgetCheckoutMessage = {
  type: typeof WIDGET_CHECKOUT_EVENT;
  checkout_url: string;
  checkoutUrl?: string;
  /** Phase B hold — present when create reserved a slot, not a booking. */
  hold_id?: string;
  hold_expires_at?: string;
  expires_at?: string;
  status?: string;
  /** Absent until webhook creates the appointment after pay. */
  booking_id?: string | null;
};

/** Query params the widget reads. Location is forwarded as locationId and/or locationSlug; the widget resolves it. serviceIds / serviceVariantIds only — no treatmentId / priceOptionId aliases. Deposit return URLs are host booking paths (`?deposit=success|cancel`) — no booking_id. */
export type WidgetEmbedParams = {
  companyId: string;
  locationId?: string;
  locationSlug?: string;
  staffIds?: string[];
  staffSlugs?: string[];
  serviceIds?: string[];
  serviceVariantIds?: string[];
  /** Always set — deposit create requires them; no-deposit create ignores them. */
  successUrl: string;
  cancelUrl: string;
  depositAmount?: number;
  depositEnabled?: boolean;
  /** Stripe success return — widget #12 shows Tot snel + confetti immediately. */
  deposit?: "success";
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

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) {
  const trimmed = value?.trim();
  if (trimmed) {
    params.set(key, trimmed);
  }
}

export function buildWidgetUrl(
  widgetDomain: string,
  {
    companyId,
    locationId,
    locationSlug,
    staffIds,
    staffSlugs,
    serviceIds,
    serviceVariantIds,
    successUrl,
    cancelUrl,
    depositAmount,
    depositEnabled,
    deposit,
  }: WidgetEmbedParams,
): string {
  const params = new URLSearchParams();
  params.set("companyId", companyId);
  setParam(params, "locationId", locationId);
  setParam(params, "locationSlug", locationSlug);
  setListParam(params, "staffIds", staffIds);
  setListParam(params, "staffSlugs", staffSlugs);
  setListParam(params, "serviceIds", serviceIds);
  setListParam(params, "serviceVariantIds", serviceVariantIds);
  setParam(params, "successUrl", successUrl);
  setParam(params, "cancelUrl", cancelUrl);
  // Architect / BE: appointment-create reads snake_case. Widget accepts both.
  setParam(params, "success_url", successUrl);
  setParam(params, "cancel_url", cancelUrl);
  if (depositEnabled) {
    params.set("depositEnabled", "true");
  }
  if (depositAmount != null && Number.isFinite(depositAmount) && depositAmount > 0) {
    params.set("depositAmount", String(depositAmount));
  }
  // Success return only — cancel stays on the picker so the customer can retry.
  if (deposit === "success") {
    params.set("deposit", "success");
  }
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
