import type { PaymentType } from "./order-create-payload";

export const CHARGES_NOT_ENABLED = "CHARGES_NOT_ENABLED";

export interface CreateOrderV3PaymentResult {
  id: string;
  payment_type: PaymentType;
  amount: number;
  status: string;
  payment_status: string;
  paid: boolean;
  payment_intent_id: string | null;
  client_secret?: string | null;
  publishable_key?: string | null;
}

export interface CreateOrderWithPaymentV3Response {
  success: boolean;
  data?: {
    order_id: string;
    payments: CreateOrderV3PaymentResult[];
    client_secret?: string | null;
    publishable_key?: string | null;
  };
  /** Original `response.text()` / JSON, before layer unwrap. */
  raw?: unknown;
  error?: string;
  message?: string;
  code?: string;
  status?: number;
}

type LoosePayload = {
  success?: unknown;
  data?: unknown;
  error?: unknown;
  message?: unknown;
  code?: unknown;
  order_id?: unknown;
  payments?: unknown;
  payment?: unknown;
  payment_intent?: unknown;
  payment_intent_client_secret?: unknown;
  stripe?: unknown;
  stripe_client_secret?: unknown;
  client_secret?: unknown;
  clientSecret?: unknown;
  publishable_key?: unknown;
};

function asRecord(value: unknown): LoosePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as LoosePayload;
}

/** `functions.invoke` / `response.text()` yield a string when Content-Type is not JSON. */
function coerceOrderCreateJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.replace(/^\uFEFF/, "").trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function collectOrderCreateLayers(data: unknown): LoosePayload[] {
  const layers: LoosePayload[] = [];
  let current: unknown = coerceOrderCreateJson(data);
  for (let depth = 0; depth < 4; depth += 1) {
    const record = asRecord(current);
    if (!record) break;
    layers.push(record);
    current = coerceOrderCreateJson(record.data);
  }
  return layers;
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNestedSecret(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  return (
    readTrimmedString(record.client_secret) ??
    readTrimmedString(record.payment_intent_client_secret) ??
    readTrimmedString(record.stripe_client_secret) ??
    readTrimmedString(record.clientSecret)
  );
}

/** Secrets that live beside `payments[]`, not only as `layer.client_secret`. */
function readLayerClientSecret(layer: LoosePayload): string | undefined {
  const fromPayments = asPaymentList(layer.payments)
    .map(
      (payment) =>
        readNestedSecret(payment) ??
        readNestedSecret(asRecord(payment)?.payment_intent),
    )
    .find(Boolean);

  return (
    readTrimmedString(layer.client_secret) ??
    readTrimmedString(layer.payment_intent_client_secret) ??
    readTrimmedString(layer.stripe_client_secret) ??
    readTrimmedString(layer.clientSecret) ??
    readNestedSecret(layer.payment_intent) ??
    readNestedSecret(layer.stripe) ??
    readNestedSecret(layer.payment) ??
    readNestedSecret(asRecord(layer.payment)?.payment_intent) ??
    fromPayments
  );
}

function asPaymentList(value: unknown): unknown[] {
  const coerced = coerceOrderCreateJson(value);
  if (Array.isArray(coerced)) return coerced;
  const record = asRecord(coerced);
  return record ? [record] : [];
}

function normalizePayments(layer: LoosePayload): unknown[] {
  const listed = asPaymentList(layer.payments);
  if (listed.length > 0) return listed;
  const singular = asRecord(layer.payment);
  if (singular) return [singular];
  return listed;
}

function isOrderPayload(layer: LoosePayload): boolean {
  return (
    typeof layer.order_id === "string" ||
    asPaymentList(layer.payments).length > 0 ||
    !!asRecord(layer.payment)
  );
}

/** Prefer a real order row over a wrapper that happens to have `payments: []`. */
function pickOrderLayer(layers: LoosePayload[]): LoosePayload | undefined {
  return (
    layers.find((layer) => typeof layer.order_id === "string") ??
    layers.find((layer) => normalizePayments(layer).length > 0) ??
    layers.find(isOrderPayload)
  );
}

function collectNormalizedPayments(
  orderLayer: LoosePayload,
  layers: LoosePayload[],
): unknown[] {
  const fromOrder = normalizePayments(orderLayer);
  if (fromOrder.length > 0) return fromOrder;
  for (const layer of layers) {
    const payments = normalizePayments(layer);
    if (payments.length > 0) return payments;
  }
  return [];
}

export function isChargesNotEnabledError(result: {
  code?: string;
  error?: string;
}): boolean {
  return (
    result.code === CHARGES_NOT_ENABLED || result.error === CHARGES_NOT_ENABLED
  );
}

export function parseOrderCreateResponse(
  httpStatus: number,
  data: unknown,
): CreateOrderWithPaymentV3Response {
  const layers = collectOrderCreateLayers(data);
  const orderLayer = pickOrderLayer(layers);
  const error =
    layers.map((layer) => readTrimmedString(layer.error)).find(Boolean) ??
    undefined;
  const message =
    layers.map((layer) => readTrimmedString(layer.message)).find(Boolean) ??
    undefined;
  const code =
    layers.some(
      (layer) =>
        layer.code === CHARGES_NOT_ENABLED ||
        layer.error === CHARGES_NOT_ENABLED,
    )
      ? CHARGES_NOT_ENABLED
      : layers.map((layer) => readTrimmedString(layer.code)).find(Boolean);

  const ok = httpStatus >= 200 && httpStatus < 300;
  const envelopeFailed = layers.some((layer) => layer.success === false);
  const success = ok && !envelopeFailed && !!orderLayer;

  if (success && orderLayer) {
    const payments = collectNormalizedPayments(
      orderLayer,
      layers,
    ) as CreateOrderV3PaymentResult[];
    const clientSecret =
      readLayerClientSecret(orderLayer) ??
      layers.map(readLayerClientSecret).find(Boolean);
    const publishableKey =
      readTrimmedString(orderLayer.publishable_key) ??
      layers
        .map((layer) => readTrimmedString(layer.publishable_key))
        .find(Boolean);

    return {
      success: true,
      data: {
        order_id:
          typeof orderLayer.order_id === "string" ? orderLayer.order_id : "",
        payments,
        client_secret: clientSecret,
        publishable_key: publishableKey,
      },
      raw: data,
      status: httpStatus,
    };
  }

  return {
    success: false,
    raw: data,
    error: error || "Failed to create order",
    message,
    code,
    status: httpStatus,
  };
}
