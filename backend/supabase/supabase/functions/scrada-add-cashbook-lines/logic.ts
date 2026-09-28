import type { SupabaseClient } from "supabase";
import { scradaConfigSchema, type ScradaConfig } from "./schema.ts";

const LINE_TYPE_NORMAL = 1;

export type ScradaAddCashbookLinesResult = {
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

type PaymentRow = {
  id: string;
  amount_gross: number | null;
  amount: number | null;
  paid_at: string | null;
  created_at: string;
  order_id: string | null;
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

async function getCashBookCurrentBalance(
  base: string,
  integration: IntegrationRow,
  config: ScradaConfig,
): Promise<number> {
  const url =
    `${base}/company/${integration.external_company_id}/cashBook/${config.cashbook_id}`;
  const { ok, status, data, text } = await scradaJson<{ currentBalance?: number }>(
    url,
    { method: "GET", headers: scradaHeaders(integration, config) },
  );
  if (!ok) {
    throw new Error(
      `Scrada GET cashBook failed (${status}): ${text.slice(0, 500)}`,
    );
  }
  const bal = data?.currentBalance;
  if (typeof bal !== "number" || Number.isNaN(bal)) {
    throw new Error("Scrada cashBook response missing currentBalance");
  }
  return round2(bal);
}

type CashBookLinePayload = {
  lineType: number;
  transactionTypeID: string;
  amount: number;
  remark?: string;
  externalReference?: string;
  externalData?: string;
};

async function putCashBookLines(
  base: string,
  integration: IntegrationRow,
  config: ScradaConfig,
  body: {
    date: string;
    startBalance: number;
    endBalance: number;
    lines: CashBookLinePayload[];
  },
): Promise<string[]> {
  const url =
    `${base}/company/${integration.external_company_id}/cashBook/${config.cashbook_id}/lines`;
  const { ok, status, data, text } = await scradaJson<string[]>(url, {
    method: "PUT",
    headers: scradaHeaders(integration, config),
    body: JSON.stringify({
      date: body.date,
      startBalance: body.startBalance,
      endBalance: body.endBalance,
      lines: body.lines.map((l) => ({
        lineType: l.lineType,
        transactionTypeID: l.transactionTypeID,
        amount: l.amount,
        ...(l.remark !== undefined && { remark: l.remark }),
        ...(l.externalReference !== undefined && {
          externalReference: l.externalReference,
        }),
        ...(l.externalData !== undefined && { externalData: l.externalData }),
      })),
    }),
  });
  if (!ok) {
    throw new Error(`Scrada PUT cashBook lines failed (${status}): ${text.slice(0, 500)}`);
  }
  if (!Array.isArray(data)) {
    throw new Error("Scrada PUT cashBook lines: expected JSON array of GUIDs");
  }
  return data;
}

export async function scradaAddCashbookLinesInFunction(
  supabase: SupabaseClient,
  input: { company_id: string; payment_ids: string[] },
): Promise<ScradaAddCashbookLinesResult> {
  const paymentIds = [...new Set(input.payment_ids)];

  console.log("[scrada-add-cashbook-lines:logic] start", {
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

  console.log("[scrada-add-cashbook-lines:logic] integration loaded", {
    external_company_id: integration.external_company_id,
    cashbook_id: config.cashbook_id,
    scradaBaseUrl: scradaBaseUrl(),
  });

  const { data: payments, error: payErr } = await supabase
    .from("payment")
    .select("id, amount_gross, amount, paid_at, created_at, order_id")
    .eq("company_id", input.company_id)
    .eq("payment_status", "paid")
    .is("cashbook_id", null)
    .in("id", paymentIds)
    .order("paid_at", { ascending: true, nullsFirst: false });

  if (payErr) {
    throw new Error(payErr.message);
  }
  const list = (payments ?? []) as PaymentRow[];

  console.log("[scrada-add-cashbook-lines:logic] payments to sync", {
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
  const allLineIds: string[] = [];
  const batches: { date: string; lineIds: string[] }[] = [];

  for (const date of dates) {
    const dayPayments = byDate.get(date)!;
    console.log("[scrada-add-cashbook-lines:logic] batch", {
      date,
      paymentsThisDay: dayPayments.length,
    });
    const startBalance = await getCashBookCurrentBalance(base, integration, config);
    console.log("[scrada-add-cashbook-lines:logic] startBalance", { date, startBalance });

    const lines: CashBookLinePayload[] = dayPayments.map((p) => {
      const amt = paymentAmount(p);
      const orderNum = p.order_id ? orderMap.get(p.order_id) : null;
      const remark = orderNum ? `Order ${orderNum}` : undefined;
      const externalData = JSON.stringify({
        payment_id: p.id,
        order_id: p.order_id,
        amount: amt,
      });
      return {
        lineType: LINE_TYPE_NORMAL,
        transactionTypeID: config.transaction_type_id,
        amount: amt,
        ...(remark && { remark }),
        externalReference: p.id,
        externalData,
      };
    });

    const delta = round2(lines.reduce((s, l) => s + l.amount, 0));
    const endBalance = round2(startBalance + delta);

    const returnedIds = await putCashBookLines(base, integration, config, {
      date,
      startBalance,
      endBalance,
      lines,
    });

    if (returnedIds.length !== dayPayments.length) {
      throw new Error(
        `Scrada returned ${returnedIds.length} line id(s), expected ${dayPayments.length}`,
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
