import { normalizePublicOrigin } from "@/lib/public-origin";
import { APP_URL } from "@/lib/supabase/config";
import { WIDGET_BOOKING_EVENT, WIDGET_CHECKOUT_EVENT } from "@/lib/widget";

/** Stripe Checkout success / cancel landing on this host. */
export type DepositReturn = "success" | "cancel";

const CANCEL_VALUES = new Set(["cancel", "cancelled", "canceled"]);
const SUCCESS_VALUES = new Set(["success", "paid", "complete"]);

/** Stripe substitutes this on the Checkout success URL. */
export const STRIPE_SESSION_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

function firstQueryValue(value?: string | string[]): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Stripe Checkout session id from the return URL (optional; not a gate). */
function parseDepositSessionId(search: {
  session_id?: string | string[];
}): string | null {
  const raw = firstQueryValue(search.session_id);
  if (!raw || raw === STRIPE_SESSION_PLACEHOLDER) return null;
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(raw) ? raw : null;
}

function normalizeStatus(value: string | undefined): DepositReturn | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (CANCEL_VALUES.has(lower)) return "cancel";
  if (SUCCESS_VALUES.has(lower)) return "success";
  return null;
}

/**
 * Read deposit return state from the booking URL.
 * `deposit` wins, then `checkout`, then Stripe `session_id` as success
 * unless the other flags say cancel.
 *
 * Stripe only redirects to success_url after a paid Checkout session, so
 * `?deposit=success` is treated as paid immediately and forwarded to the
 * widget. This host does not poll hold/appointment status.
 * `booking_id` / `appointment_id` / `hold_id` on the URL are ignored.
 */
export function parseDepositReturn(search: {
  deposit?: string | string[];
  checkout?: string | string[];
  session_id?: string | string[];
}): DepositReturn | null {
  const fromDeposit = normalizeStatus(firstQueryValue(search.deposit));
  if (fromDeposit) return fromDeposit;

  const fromCheckout = normalizeStatus(firstQueryValue(search.checkout));
  if (fromCheckout) return fromCheckout;

  if (parseDepositSessionId(search)) {
    return "success";
  }

  return null;
}

export function depositReturnUrls(
  bookingPath: string,
  origin: string = APP_URL,
): {
  successUrl: string;
  cancelUrl: string;
} {
  const safeOrigin = normalizePublicOrigin(origin);
  const path = bookingPath.startsWith("/") ? bookingPath : `/${bookingPath}`;
  const base = `${safeOrigin}${path === "/" ? "" : path}`;
  return {
    // Hold path: return to the booking page, not an appointment id.
    // Stripe substitutes session_id. The host forwards deposit=success to
    // the widget (no host Tot snel overlay, no webhook/hold poll).
    successUrl: `${base}?deposit=success&session_id=${STRIPE_SESSION_PLACEHOLDER}`,
    cancelUrl: `${base}?deposit=cancel`,
  };
}

/** Only Stripe Checkout hosts — never open-redirect the top window. */
export function isStripeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "checkout.stripe.com" || host.endsWith(".checkout.stripe.com");
  } catch {
    return false;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && isStripeCheckoutUrl(trimmed) ? trimmed : null;
}

/**
 * Read Stripe Checkout URL from a create/hold payload.
 * `checkout_url` is enough — `booking_id` is not required (Phase B hold).
 */
function checkoutUrlFromPayload(payload: Record<string, unknown>): string | null {
  const hold = asRecord(payload.hold);
  const checkout = asRecord(payload.checkout);
  return (
    readCheckoutUrl(payload.checkout_url) ??
    readCheckoutUrl(payload.checkoutUrl) ??
    readCheckoutUrl(hold?.checkout_url) ??
    readCheckoutUrl(hold?.checkoutUrl) ??
    readCheckoutUrl(checkout?.url) ??
    readCheckoutUrl(checkout?.checkout_url)
  );
}

/**
 * Widget → host: checkout_url after deposit create (Phase B hold or legacy).
 * Accepts `salonify-checkout` or `salonify-booking-event` with event `checkout`.
 * Redirects on `checkout_url` even when `booking_id` is missing/null and only
 * `hold_id` / `hold_expires_at` / `status: hold_active` are present.
 */
export function checkoutUrlFromWidgetMessage(data: unknown): string | null {
  const message = asRecord(data);
  if (!message) return null;

  const type = message.type;
  if (type === WIDGET_CHECKOUT_EVENT) {
    return checkoutUrlFromPayload(message);
  }

  if (type === WIDGET_BOOKING_EVENT && message.event === "checkout") {
    const nested = asRecord(message.data);
    return checkoutUrlFromPayload(nested ?? message);
  }

  return null;
}

export type CompanyDeposit = {
  enabled: boolean;
  amount: number | null;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

/** Optional fields already on company-get — no new RPC. */
export function readCompanyDeposit(company: {
  deposit_enabled?: boolean | string | null;
  deposit_amount?: number | string | null;
  deposit_amount_cents?: number | string | null;
}): CompanyDeposit {
  const amountEuros = asFiniteNumber(company.deposit_amount);
  const amountCents = asFiniteNumber(company.deposit_amount_cents);
  const amount =
    amountEuros != null && amountEuros > 0
      ? amountEuros
      : amountCents != null && amountCents > 0
        ? amountCents / 100
        : null;

  const flag = asBoolean(company.deposit_enabled);
  const enabled = flag === true || (flag !== false && amount != null && amount > 0);

  return {
    enabled: enabled && amount != null && amount > 0,
    amount,
  };
}
