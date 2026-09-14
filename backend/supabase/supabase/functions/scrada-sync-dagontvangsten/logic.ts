import type { SupabaseClient } from "supabase";
import { scradaConfigSchema, type ScradaConfig } from "./schema.ts";

const JOURNAL_LINE_TYPE_NORMAL = 1;

export type ScradaSyncDagontvangstenResult = {
  synced: number;
  lineIds: string[];
  batches: { date: string; lineIds: string[] }[];
};

type IntegrationRow = {
  api_key: string;
  api_password: string;
  external_company_id: string;
  config: unknown;
};

const SALONIFY_SYNC_METHODS = ["cash", "bank_transfer", "card", "invoice"] as const;

type PaymentRow = {
  id: string;
  payment_method: string | null;
  amount_gross: number | null;
  amount: number | null;
  paid_at: string | null;
  created_at: string;
  order_id: string | null;
};

type JournalGetResponse = {
  lastLineID?: string | null;
};

type JournalLinesPutResponse = {
  journalLines?: string[];
  cashBookLines?: string[];
  message?: {
    errorCode?: number;
    defaultFormat?: string;
    innerErrors?: unknown[];
  };
};

function scradaBaseUrl(): string {
  const raw = Deno.env.get("SCRADA_API_BASE_URL") ?? "https://api.scrada.be/v1";
  return raw.replace(/\/+$/, "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function paymentAmount(p: PaymentRow): number {
  const v = p.amount_gross ?? p.amount ?? 0;
  return round2(Number(v));
}

function scradaPaymentMethodIdForSalonifyMethod(
  config: ScradaConfig,
  method: string | null,
): string {
  const m = String(method || "").toLowerCase();
  const map = config.payment_method_map;
  if (m === "cash") return map.cash;
  if (m === "bank_transfer") return map.bank_transfer;
  if (m === "card") return map.card;
  if (m === "invoice") return map.invoice ?? map.bank_transfer;
  throw new Error(`Unsupported payment_method for Scrada sync: ${method ?? "(empty)"}`);
}

/** One Scrada paymentMethod row per UUID; amounts aggregated (allowMultiple often false). */
function buildAggregatedPaymentMethods(
  dayPayments: PaymentRow[],
  config: ScradaConfig,
  date: string,
): { paymentMethodID: string; amount: number; externalData?: string }[] {
  const totals = new Map<string, number>();
  for (const p of dayPayments) {
    const scradaId = scradaPaymentMethodIdForSalonifyMethod(config, p.payment_method);
    const amt = paymentAmount(p);
    totals.set(scradaId, round2((totals.get(scradaId) ?? 0) + amt));
  }
  const rows: { paymentMethodID: string; amount: number; externalData?: string }[] = [];
  for (const [paymentMethodID, amount] of totals) {
    if (amount <= 0) continue;
    rows.push({
      paymentMethodID,
      amount,
      externalData: JSON.stringify({
        date,
        salonify_methods: dayPayments
          .filter((p) =>
            scradaPaymentMethodIdForSalonifyMethod(config, p.payment_method) === paymentMethodID
          )
          .map((p) => ({ id: p.id, method: p.payment_method })),
      }),
    });
  }
  return rows;
}

function paymentLineDate(p: PaymentRow): string {
  const iso = p.paid_at ?? p.created_at;
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function scradaHeaders(
  integration: IntegrationRow,
  config: ScradaConfig,
): HeadersInit {
  const h: Record<string, string> = {
    "X-API-KEY": integration.api_key,
    "X-PASSWORD": integration.api_password,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.language) {
    h.Language = config.language;
  }
  return h;
}

async function scradaJson<T>(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; text: string }> {
  const method = (init.method ?? "GET").toUpperCase();
  console.log("[Scrada] fetch start", { method, url });
  const res = await fetch(url, init);
  console.log("[Scrada] fetch response headers", {
    method,
    url,
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get("content-type"),
  });
  const text = await res.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }
  console.log("[Scrada] fetch complete", {
    method,
    url,
    status: res.status,
    ok: res.ok,
    bodyLength: text.length,
    bodyEmpty: text.length === 0,
    body: data ?? text.slice(0, 2000),
  });
  return { ok: res.ok, status: res.status, data, text };
}

async function getJournalLastLineId(
  base: string,
  integration: IntegrationRow,
  journalId: string,
  config: ScradaConfig,
): Promise<string | null> {
  const url =
    `${base}/company/${integration.external_company_id}/journal/${journalId}`;
  const { ok, status, data, text } = await scradaJson<JournalGetResponse>(url, {
    method: "GET",
    headers: scradaHeaders(integration, config),
  });
  if (!ok) {
    throw new Error(`Scrada GET journal failed (${status}): ${text.slice(0, 500)}`);
  }
  const id = data?.lastLineID;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function putJournalLines(
  base: string,
  integration: IntegrationRow,
  journalId: string,
  config: ScradaConfig,
  body: {
    date: string;
    lastJournalLineID: string | null;
    lines: {
      lineType: number;
      vatTypeID: string;
      vatPerc: number;
      amount: number;
      categoryID: string;
      remark?: string;
      externalReference?: string;
      externalData?: string;
    }[];
    paymentMethods: {
      paymentMethodID: string;
      amount: number;
      remark?: string;
      externalReference?: string;
      externalData?: string;
    }[];
  },
): Promise<string[]> {
  const url =
    `${base}/company/${integration.external_company_id}/journal/${journalId}/lines`;

  const payload: Record<string, unknown> = {
    date: body.date,
    lines: body.lines.map((l) => ({
      lineType: l.lineType,
      vatTypeID: l.vatTypeID,
      vatPerc: l.vatPerc,
      amount: l.amount,
      categoryID: l.categoryID,
      ...(l.remark !== undefined && { remark: l.remark }),
      ...(l.externalReference !== undefined && {
        externalReference: l.externalReference,
      }),
      ...(l.externalData !== undefined && { externalData: l.externalData }),
    })),
    paymentMethods: body.paymentMethods.map((p) => ({
      paymentMethodID: p.paymentMethodID,
      amount: p.amount,
      ...(p.remark !== undefined && { remark: p.remark }),
      ...(p.externalReference !== undefined && {
        externalReference: p.externalReference,
      }),
      ...(p.externalData !== undefined && { externalData: p.externalData }),
    })),
  };

  if (body.lastJournalLineID) {
    payload.lastJournalLineID = body.lastJournalLineID;
  }

  console.log("[Scrada] PUT journal/lines request", {
    url,
    body: payload,
    bodyJson: JSON.stringify(payload),
  });

  const { ok, status, data, text } = await scradaJson<JournalLinesPutResponse>(url, {
    method: "PUT",
    headers: scradaHeaders(integration, config),
    body: JSON.stringify(payload),
  });

  if (!ok) {
    throw new Error(`Scrada PUT journal lines failed (${status}): ${text.slice(0, 800)}`);
  }

  const msg = data?.message;
  if (msg && typeof msg.errorCode === "number" && msg.errorCode !== 0) {
    const detail = msg.defaultFormat ?? JSON.stringify(msg.innerErrors ?? []);
    throw new Error(`Scrada journal lines rejected: ${detail}`);
  }

  const ids = data?.journalLines;
  if (!Array.isArray(ids)) {
    throw new Error("Scrada PUT journal lines: expected journalLines array");
  }
  return ids;
}

export async function scradaSyncDagontvangstenInFunction(
  supabase: SupabaseClient,
  input: { company_id: string; payment_ids: string[] },
): Promise<ScradaSyncDagontvangstenResult> {
  const paymentIds = [...new Set(input.payment_ids)];

  console.log("[scrada-sync-dagontvangsten:logic] start", {
    company_id: input.company_id,
    payment_ids_count: paymentIds.length,
  });

  const { data: integrationRow, error: intErr } = await supabase
    .from("company_integrations")
    .select("api_key, api_password, external_company_id, config")
    .eq("company_id", input.company_id)
    .eq("integration_type", "scrada")
    .eq("active", true)
    .maybeSingle();

  if (intErr) {
    throw new Error(intErr.message);
  }
  if (!integrationRow) {
    throw new Error("No active Scrada integration for this company");
  }

  const parsed = scradaConfigSchema.safeParse(integrationRow.config);
  if (!parsed.success) {
    throw new Error(
      `Invalid Scrada config: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
    );
  }
  const config = parsed.data;
  const integration = integrationRow as IntegrationRow;

  console.log("[scrada-sync-dagontvangsten:logic] integration loaded", {
    external_company_id: integration.external_company_id,
    journal_id: config.journal_id,
    scradaBaseUrl: scradaBaseUrl(),
  });

  const { data: payments, error: payErr } = await supabase
    .from("payment")
    .select("id, payment_method, amount_gross, amount, paid_at, created_at, order_id")
    .eq("company_id", input.company_id)
    .in("payment_method", [...SALONIFY_SYNC_METHODS])
    .eq("payment_status", "paid")
    .is("cashbook_id", null)
    .in("id", paymentIds)
    .order("paid_at", { ascending: true, nullsFirst: false });

  if (payErr) {
    throw new Error(payErr.message);
  }
  const list = (payments ?? []) as PaymentRow[];

  if (list.length !== paymentIds.length) {
    const found = new Set(list.map((p) => p.id));
    const missing = paymentIds.filter((id) => !found.has(id));
    throw new Error(
      `Not all payment_ids are eligible (must be cash|bank_transfer|card|invoice, paid, same company, cashbook_id null): ${missing.join(", ")}`,
    );
  }

  console.log("[scrada-sync-dagontvangsten:logic] payments to sync", {
    count: list.length,
    ids: list.map((p) => p.id),
  });

  const orderIds = [
    ...new Set(list.map((p) => p.order_id).filter(Boolean)),
  ] as string[];
  const orderMap = new Map<string, string | null>();
  if (orderIds.length > 0) {
    const { data: orders, error: ordErr } = await supabase
      .from("order")
      .select("id, order_number")
      .in("id", orderIds);
    if (ordErr) {
      throw new Error(ordErr.message);
    }
    for (const o of orders ?? []) {
      orderMap.set(
        (o as { id: string }).id,
        (o as { order_number: string | null }).order_number ?? null,
      );
    }
  }

  const byDate = new Map<string, PaymentRow[]>();
  for (const p of list) {
    const d = paymentLineDate(p);
    const arr = byDate.get(d) ?? [];
    arr.push(p);
    byDate.set(d, arr);
  }
  const dates = [...byDate.keys()].sort();

  const base = scradaBaseUrl();
  const journalId = config.journal_id;
  const allLineIds: string[] = [];
  const batches: { date: string; lineIds: string[] }[] = [];

  for (const date of dates) {
    const dayPayments = byDate.get(date)!;
    console.log("[scrada-sync-dagontvangsten:logic] batch", {
      date,
      paymentsThisDay: dayPayments.length,
    });

    const lastJournalLineID = await getJournalLastLineId(
      base,
      integration,
      journalId,
      config,
    );
    console.log("[scrada-sync-dagontvangsten:logic] lastJournalLineID", {
      date,
      lastJournalLineID,
    });

    const lines = dayPayments.map((p) => {
      const amt = paymentAmount(p);
      const orderNum = p.order_id ? orderMap.get(p.order_id) : null;
      const remark = orderNum ? `Order ${orderNum}` : undefined;
      const externalData = JSON.stringify({
        payment_id: p.id,
        order_id: p.order_id,
        amount: amt,
      });
      return {
        lineType: JOURNAL_LINE_TYPE_NORMAL,
        vatTypeID: config.vat_type_id,
        vatPerc: config.vat_percentage,
        amount: amt,
        categoryID: config.category_id,
        ...(remark && { remark }),
        externalReference: p.id,
        externalData,
      };
    });

    const dayLinesTotal = round2(lines.reduce((s, l) => s + l.amount, 0));
    const paymentMethods = buildAggregatedPaymentMethods(dayPayments, config, date);
    const dayPmTotal = round2(paymentMethods.reduce((s, m) => s + m.amount, 0));
    if (dayLinesTotal !== dayPmTotal) {
      throw new Error(
        `Internal totals mismatch: lines ${dayLinesTotal} vs paymentMethods ${dayPmTotal} for ${date}`,
      );
    }

    const returnedIds = await putJournalLines(base, integration, journalId, config, {
      date,
      lastJournalLineID,
      lines,
      paymentMethods,
    });

    if (returnedIds.length !== dayPayments.length) {
      throw new Error(
        `Scrada returned ${returnedIds.length} journal line id(s), expected ${dayPayments.length}`,
      );
    }

    for (let i = 0; i < dayPayments.length; i++) {
      const pid = dayPayments[i].id;
      const lineId = returnedIds[i];
      const { error: upErr } = await supabase
        .from("payment")
        .update({ cashbook_id: lineId, updated_at: new Date().toISOString() })
        .eq("id", pid)
        .eq("company_id", input.company_id);
      if (upErr) {
        throw new Error(`Failed to update payment ${pid}: ${upErr.message}`);
      }
    }

    allLineIds.push(...returnedIds);
    batches.push({ date, lineIds: returnedIds });
  }

  return { synced: list.length, lineIds: allLineIds, batches };
}
