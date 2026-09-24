"use server";

import { createClient } from "@/lib/supabase/server";
import { rpcHasCompanyPermission } from "@/lib/auth/membership-client";
import type { MembershipSupabase } from "@/lib/auth/membership-client";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "GleamiSalonWeb/1.0 (salon marketplace settings; https://github.com/glenntroncquo/gleami)";
const MIN_INTERVAL_MS = 1100;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let nextAllowedAt = 0;

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; reason: "unauthorized" | "invalid" | "empty" | "rate" | "failed" };

async function takeSlot(): Promise<boolean> {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);
  if (wait > 5000) return false;
  nextAllowedAt = Math.max(now, nextAllowedAt) + MIN_INTERVAL_MS;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return true;
}

/**
 * Nominatim has no API key. The browser cannot set User-Agent, so the
 * lookup runs here. One request per second, shared by this server process.
 */
export async function geocodeMarketplaceAddress(input: {
  companyId: string;
  query: string;
}): Promise<GeocodeResult> {
  const companyId = input.companyId?.trim() ?? "";
  const query = input.query?.trim().replace(/\s+/g, " ") ?? "";
  if (!UUID_RE.test(companyId) || query.length < 3 || query.length > 240) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthorized" };

  const membership = supabase as unknown as MembershipSupabase;
  const [locations, settings] = await Promise.all([
    rpcHasCompanyPermission(membership, "locations:manage", companyId),
    rpcHasCompanyPermission(membership, "settings:manage", companyId),
  ]);
  if (locations !== true && settings !== true) {
    return { ok: false, reason: "unauthorized" };
  }

  const allowed = await takeSlot();
  if (!allowed) return { ok: false, reason: "rate" };

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "nl",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 429) return { ok: false, reason: "rate" };
    if (!response.ok) return { ok: false, reason: "failed" };
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || rows.length === 0) return { ok: false, reason: "empty" };
    const row = rows[0] as { lat?: unknown; lon?: unknown; display_name?: unknown };
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, reason: "empty" };
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { ok: false, reason: "empty" };
    const label = typeof row.display_name === "string" ? row.display_name : "";
    return { ok: true, lat, lng, label };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
