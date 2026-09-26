import { describe, expect, it } from "vitest";
import { rebuildMarketplaceSearchLocation } from "../../supabase/functions/_shared/marketplace/rebuild.ts";
import type { MarketplaceSql } from "../../supabase/functions/_shared/marketplace/sql.ts";

const locationId = "11111111-1111-4111-8111-111111111111";
const categoryKeratin = "01900000-0000-4000-8000-000000000004";

/**
 * postgres.js serializes a `::jsonb` parameter with JSON.stringify once
 * (oid 3802), then Postgres parses that text as jsonb. A second stringify
 * stores a jsonb string, which fails
 * marketplace_search_location_treatments_array
 * (`jsonb_typeof(treatments) = 'array'`).
 */
function jsonbTypeofAfterCast(bound: unknown): string {
  const stored: unknown = JSON.parse(JSON.stringify(bound));
  if (Array.isArray(stored)) return "array";
  if (stored === null) return "null";
  if (typeof stored === "object") return "object";
  return typeof stored;
}

interface CapturedQuery {
  parts: string[];
  values: unknown[];
}

function fakeSql(row: Record<string, unknown> | null): { sql: MarketplaceSql; calls: CapturedQuery[] } {
  const calls: CapturedQuery[] = [];
  const query = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ parts: [...strings], values });
    const text = strings.join(" ");
    if (text.includes("as services")) {
      return Promise.resolve(row ? [row] : []);
    }
    return Promise.resolve([]);
  };
  const sql = Object.assign(query, {
    begin: <T>(callback: (tx: MarketplaceSql) => Promise<T>) => callback(query as MarketplaceSql),
  }) as MarketplaceSql;
  return { sql, calls };
}

function listedLocation(services: unknown[]) {
  return {
    id: locationId,
    company_id: "22222222-2222-4222-8222-222222222222",
    name: "Salon Noord",
    slug: "salon-noord",
    image_url: null,
    street: "Kerkstraat 1",
    postal_code: "2000",
    city: "Antwerpen",
    country: "BE",
    timezone: "Europe/Brussels",
    is_listed: true,
    is_active: true,
    has_coordinates: true,
    like_count: 1,
    services,
    categories: [{ id: categoryKeratin, name: "Keratine" }],
  };
}

function treatmentsParameter(call: CapturedQuery): unknown {
  const castIndex = call.parts.findIndex((part) => part.includes("::jsonb"));
  expect(castIndex).toBeGreaterThan(0);
  return call.values[castIndex - 1];
}

describe("rebuildMarketplaceSearchLocation treatments bind", () => {
  it("binds treatments as an array so ::jsonb stores a jsonb array", async () => {
    const { sql, calls } = fakeSql(listedLocation([
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Keratine behandeling",
        isActive: true,
        isDeleted: false,
        isMarketplaceVisible: true,
        categoryIds: [categoryKeratin],
        variants: [{
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          displayOrder: 1,
          isActive: true,
          isDeleted: false,
        }],
      },
    ]));

    await expect(rebuildMarketplaceSearchLocation(sql, locationId)).resolves.toBe("upserted");

    const insert = calls.find((call) => call.parts.join(" ").includes("insert into public.marketplace_search_location"));
    expect(insert).toBeDefined();
    const treatments = treatmentsParameter(insert!);
    expect(treatments).toEqual([
      {
        serviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        serviceVariantId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        name: "Keratine behandeling",
      },
    ]);
    expect(Array.isArray(treatments)).toBe(true);
    expect(jsonbTypeofAfterCast(treatments)).toBe("array");
    expect(jsonbTypeofAfterCast(JSON.stringify(treatments))).toBe("string");
  });

  it("binds an empty treatment list as an array, not the string []", async () => {
    const { sql, calls } = fakeSql(listedLocation([]));

    await expect(rebuildMarketplaceSearchLocation(sql, locationId)).resolves.toBe("upserted");

    const insert = calls.find((call) => call.parts.join(" ").includes("insert into public.marketplace_search_location"));
    const treatments = treatmentsParameter(insert!);
    expect(treatments).toEqual([]);
    expect(jsonbTypeofAfterCast(treatments)).toBe("array");
    expect(jsonbTypeofAfterCast("[]")).toBe("string");
  });
});
