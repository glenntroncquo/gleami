import { createClient } from "@/lib/supabase/client";

export const COMPANY_PAYMENT_ACCOUNT_TABLE = "company_payment_account";
export const COMPANY_PAYMENT_ACCOUNT_SELECT =
  "provider_account_id, charges_enabled, payouts_enabled, details_submitted, updated_at";
export const STRIPE_CONNECT_ONBOARD_FN = "stripe-connect-onboard";

export type CompanyPaymentAccount = {
  provider_account_id: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  details_submitted: boolean | null;
  updated_at: string | null;
};

export type ConnectStatusKind =
  | "not_connected"
  | "needs_onboarding"
  | "restricted"
  | "ready";

export type ConnectStatus = {
  kind: ConnectStatusKind;
  providerAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  updatedAt: string | null;
};

export type ConnectOnboardBody = {
  company_id: string;
  return_url: string;
  refresh_url: string;
};

export type ConnectOnboardResult = {
  url: string | null;
  account: string | null;
};

type PaymentAccountClient = {
  from: (relation: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: CompanyPaymentAccount | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

type OnboardEdgeResponse = {
  url?: unknown;
  account?: unknown;
  error?: unknown;
  message?: unknown;
  data?: unknown;
  success?: unknown;
  provider_account_id?: unknown;
};

export type ConnectOnboardPayloadShape = {
  typeof: string;
  keys: string[];
  nestedDataKeys: string[];
  success: unknown;
};

export function deriveConnectStatus(
  account: CompanyPaymentAccount | null,
): ConnectStatus {
  const providerAccountId = account?.provider_account_id?.trim() || null;
  const chargesEnabled = Boolean(account?.charges_enabled);
  const payoutsEnabled = Boolean(account?.payouts_enabled);
  const detailsSubmitted = Boolean(account?.details_submitted);
  const updatedAt = account?.updated_at ?? null;

  if (!providerAccountId) {
    return {
      kind: "not_connected",
      providerAccountId: null,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      updatedAt,
    };
  }

  if (chargesEnabled && payoutsEnabled) {
    return {
      kind: "ready",
      providerAccountId,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      updatedAt,
    };
  }

  return {
    kind: detailsSubmitted ? "restricted" : "needs_onboarding",
    providerAccountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    updatedAt,
  };
}

/** Card PaymentIntents require charges_enabled. Payouts can still be off. */
export function canTakeCardCharges(status: ConnectStatus): boolean {
  return status.chargesEnabled;
}

export function buildBillingPagePath(locale: string): string {
  return `/${locale}/billing`;
}

export function buildConnectReturnUrls(
  origin: string,
  locale: string,
): { return_url: string; refresh_url: string } {
  const base = `${origin.replace(/\/$/, "")}${buildBillingPagePath(locale)}`;
  return {
    return_url: `${base}?connect=return`,
    refresh_url: `${base}?connect=refresh`,
  };
}

export function buildConnectOnboardBody(input: {
  companyId: string;
  returnUrl: string;
  refreshUrl: string;
}): ConnectOnboardBody {
  return {
    company_id: input.companyId,
    return_url: input.returnUrl,
    refresh_url: input.refreshUrl,
  };
}

function asRecord(value: unknown): OnboardEdgeResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as OnboardEdgeResponse;
}

/** `functions.invoke` yields a string when the edge Content-Type is not JSON. */
function coerceJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function collectOnboardLayers(data: unknown): OnboardEdgeResponse[] {
  const layers: OnboardEdgeResponse[] = [];
  let current: unknown = coerceJson(data);
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) break;
    layers.push(record);
    current = coerceJson(record.data);
  }
  return layers;
}

function readOnboardUrl(payload: OnboardEdgeResponse): string | null {
  return typeof payload.url === "string" && payload.url.trim()
    ? payload.url
    : null;
}

function readOnboardAccount(payload: OnboardEdgeResponse): string | null {
  if (typeof payload.account === "string" && payload.account.trim()) {
    return payload.account;
  }
  const account = asRecord(payload.account);
  const providerAccountId = account?.provider_account_id;
  return typeof providerAccountId === "string" && providerAccountId.trim()
    ? providerAccountId
    : null;
}

export function describeConnectOnboardPayload(
  data: unknown,
): ConnectOnboardPayloadShape {
  const layers = collectOnboardLayers(data);
  const root = layers[0];
  const nested = layers[1];
  return {
    typeof: data === null ? "null" : Array.isArray(data) ? "array" : typeof data,
    keys: root ? Object.keys(root) : [],
    nestedDataKeys: nested ? Object.keys(nested) : [],
    success: root?.success ?? nested?.success,
  };
}

/**
 * Walk `{ success, data }` envelopes until an Account Link `url` appears.
 * Live `account` is an object `{ provider_account_id, ... }` — never require
 * `typeof account === "string"` before reading `url` (that was the #37 trap).
 */
export function parseConnectOnboardResponse(
  data: unknown,
): ConnectOnboardResult {
  let url: string | null = null;
  let account: string | null = null;
  for (const layer of collectOnboardLayers(data)) {
    url = url ?? readOnboardUrl(layer);
    account = account ?? readOnboardAccount(layer);
  }
  return { url, account };
}

function onboardErrorMessage(
  data: unknown,
  fallback: string | undefined,
): string {
  for (const layer of collectOnboardLayers(data)) {
    if (typeof layer.message === "string" && layer.message.trim()) {
      return layer.message;
    }
    if (typeof layer.error === "string" && layer.error.trim()) {
      return layer.error;
    }
  }
  return fallback || "Failed to start Stripe onboarding";
}

function envelopeFailed(data: unknown): boolean {
  return collectOnboardLayers(data).some((layer) => layer.success === false);
}

function logMissingOnboardUrl(
  data: unknown,
  invokeErrorMessage: string | null | undefined,
) {
  console.warn("[stripe-connect-onboard] missing Account Link url", {
    ...describeConnectOnboardPayload(data),
    invokeError: invokeErrorMessage ?? null,
  });
}

/**
 * Toast "Failed to start Stripe onboarding" when there is no Account Link url
 * and (invoke error, `success: false`, or no parsed account id).
 */
export function resolveStripeConnectOnboard(
  data: unknown,
  invokeErrorMessage?: string | null,
): ConnectOnboardResult & { error: string | null } {
  const parsed = parseConnectOnboardResponse(data);
  if (parsed.url && !envelopeFailed(data)) {
    return { ...parsed, error: null };
  }

  if (invokeErrorMessage || envelopeFailed(data) || !parsed.account) {
    logMissingOnboardUrl(data, invokeErrorMessage);
    return {
      ...parsed,
      error: onboardErrorMessage(data, invokeErrorMessage ?? undefined),
    };
  }

  return { ...parsed, error: null };
}

export async function fetchCompanyPaymentAccount(
  companyId: string,
  client: PaymentAccountClient = createClient() as unknown as PaymentAccountClient,
): Promise<{ data: CompanyPaymentAccount | null; error: string | null }> {
  const { data, error } = await client
    .from(COMPANY_PAYMENT_ACCOUNT_TABLE)
    .select(COMPANY_PAYMENT_ACCOUNT_SELECT)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message || "Failed to load payment account" };
  }

  return { data, error: null };
}

/** invoke discards the body when it throws; the Response is on error.context. */
async function recoverInvokeBody(error: { context?: unknown } | null): Promise<unknown> {
  const context = error?.context;
  if (!context || typeof context !== "object" || !("text" in context)) {
    return null;
  }
  const response = context as Pick<Response, "text">;
  if (typeof response.text !== "function") return null;
  try {
    return coerceJson(await response.text());
  } catch {
    return null;
  }
}

export async function startStripeConnectOnboard(input: {
  companyId: string;
  origin: string;
  locale: string;
}): Promise<ConnectOnboardResult & { error: string | null }> {
  const urls = buildConnectReturnUrls(input.origin, input.locale);
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(
    STRIPE_CONNECT_ONBOARD_FN,
    {
      body: buildConnectOnboardBody({
        companyId: input.companyId,
        returnUrl: urls.return_url,
        refreshUrl: urls.refresh_url,
      }),
    },
  );

  const payload = data ?? (await recoverInvokeBody(error));
  return resolveStripeConnectOnboard(payload, error?.message);
}
