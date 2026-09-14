import { createClient } from "@/lib/supabase/client";

export const PAYMENT_CREATE_CHECKOUT_FN = "payment-create-checkout";
export const CLIENT_EMAIL_REQUIRED = "CLIENT_EMAIL_REQUIRED";

export type PaymentCreateCheckoutRequest = {
  company_id: string;
  order_id: string;
  success_url: string;
  cancel_url: string;
  amount?: number;
  client_email?: string;
  location_id?: string;
};

export type PaymentCreateCheckoutData = {
  url: string;
  session_id: string;
  order_id: string;
  payment_id: string;
  email: string;
};

export type PaymentCreateCheckoutResult = {
  success: boolean;
  data?: PaymentCreateCheckoutData;
  error?: string;
  message?: string;
  code?: string;
};

type CheckoutEdgeResponse = {
  success?: unknown;
  data?: unknown;
  url?: unknown;
  session_id?: unknown;
  order_id?: unknown;
  payment_id?: unknown;
  email?: unknown;
  error?: unknown;
  message?: unknown;
  code?: unknown;
};

function asRecord(value: unknown): CheckoutEdgeResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as CheckoutEdgeResponse;
}

/** `functions.invoke` yields a string when the edge Content-Type is not JSON. */
function coerceJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.replace(/^\uFEFF/, "").trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function collectCheckoutLayers(data: unknown): CheckoutEdgeResponse[] {
  const layers: CheckoutEdgeResponse[] = [];
  let current: unknown = coerceJson(data);
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) break;
    layers.push(record);
    current = coerceJson(record.data);
  }
  return layers;
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readLayerField(
  layers: CheckoutEdgeResponse[],
  key: keyof CheckoutEdgeResponse,
): string | undefined {
  return layers.map((layer) => readTrimmedString(layer[key])).find(Boolean);
}

export function buildPayLinkReturnUrls(
  origin: string,
  locale: string,
): { success_url: string; cancel_url: string } {
  const base = `${origin.replace(/\/$/, "")}/${locale}`;
  return {
    success_url: `${base}?pay_link=success`,
    cancel_url: `${base}?pay_link=cancel`,
  };
}

export function buildPaymentCreateCheckoutBody(
  request: PaymentCreateCheckoutRequest,
): PaymentCreateCheckoutRequest {
  const body: PaymentCreateCheckoutRequest = {
    company_id: request.company_id,
    order_id: request.order_id,
    success_url: request.success_url,
    cancel_url: request.cancel_url,
  };
  if (typeof request.amount === "number" && Number.isFinite(request.amount)) {
    body.amount = Math.round(request.amount * 100) / 100;
  }
  if (request.client_email?.trim()) {
    body.client_email = request.client_email.trim();
  }
  if (request.location_id?.trim()) {
    body.location_id = request.location_id.trim();
  }
  return body;
}

export function isClientEmailRequiredError(result: {
  code?: string;
  error?: string;
}): boolean {
  return (
    result.code === CLIENT_EMAIL_REQUIRED ||
    result.error === CLIENT_EMAIL_REQUIRED
  );
}

export function parsePaymentCreateCheckoutResponse(
  data: unknown,
): PaymentCreateCheckoutResult {
  const layers = collectCheckoutLayers(data);
  const error = readLayerField(layers, "error");
  const message = readLayerField(layers, "message");
  const code = layers.some(
    (layer) =>
      layer.code === CLIENT_EMAIL_REQUIRED ||
      layer.error === CLIENT_EMAIL_REQUIRED,
  )
    ? CLIENT_EMAIL_REQUIRED
    : readLayerField(layers, "code");

  const envelopeFailed = layers.some((layer) => layer.success === false);
  const url = readLayerField(layers, "url");
  const sessionId = readLayerField(layers, "session_id");
  const orderId = readLayerField(layers, "order_id");
  const paymentId = readLayerField(layers, "payment_id");
  const email = readLayerField(layers, "email");

  if (!envelopeFailed && url && sessionId && orderId && paymentId && email) {
    return {
      success: true,
      data: {
        url,
        session_id: sessionId,
        order_id: orderId,
        payment_id: paymentId,
        email,
      },
    };
  }

  return {
    success: false,
    error: error || "Failed to create pay link",
    message,
    code,
  };
}

/** invoke discards the body when it throws; the Response is on error.context. */
async function recoverInvokeBody(
  error: { context?: unknown } | null,
): Promise<unknown> {
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

export async function createPaymentCheckout(
  request: PaymentCreateCheckoutRequest,
): Promise<PaymentCreateCheckoutResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(
    PAYMENT_CREATE_CHECKOUT_FN,
    { body: buildPaymentCreateCheckoutBody(request) },
  );

  const payload = data ?? (await recoverInvokeBody(error));
  const parsed = parsePaymentCreateCheckoutResponse(payload);
  if (parsed.success) return parsed;

  if (error?.message && !parsed.code) {
    return {
      ...parsed,
      error: parsed.error || error.message,
      message: parsed.message || error.message,
    };
  }
  return parsed;
}

export function readClientEmail(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim() && value.includes("@")) {
      return value.trim();
    }
  }
  return null;
}
