import { supabaseAdmin } from "../../../infrastructure/supabase/client.ts";
import { RepositoryError } from "../../../infrastructure/errors.ts";

/**
 * Server-side catalog pricing for order items (M3). The POS request may carry
 * unit_price / vat_rate, but those are hints from an untrusted client — the
 * values persisted on the order come from the catalog rows of THIS company.
 * Items referencing unknown, foreign, inactive, or deleted catalog rows are
 * rejected outright.
 */

export interface CatalogVariantPrice {
  id: string;
  serviceId: string;
  price: number;
  vatRate: number;
}

export interface CatalogProductPrice {
  id: string;
  priceGross: number;
  vatRate: number;
}

export interface CatalogPrices {
  variants: Map<string, CatalogVariantPrice>;
  products: Map<string, CatalogProductPrice>;
  /** Requested ids that did not resolve to a sellable catalog row. */
  missing: string[];
}

export async function loadCatalogPrices(
  companyId: string,
  variantIds: string[],
  productIds: string[],
): Promise<CatalogPrices> {
  const variants = new Map<string, CatalogVariantPrice>();
  const products = new Map<string, CatalogProductPrice>();
  const missing: string[] = [];

  if (variantIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("service_variant")
      .select("id, service_id, price, vat_rate")
      .in("id", variantIds)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (error) {
      throw new RepositoryError("Failed to load service variant prices", { cause: error });
    }

    for (const row of data ?? []) {
      variants.set(row.id, {
        id: row.id,
        serviceId: row.service_id,
        price: Number(row.price),
        vatRate: row.vat_rate == null ? 0 : Number(row.vat_rate),
      });
    }
    for (const id of variantIds) {
      if (!variants.has(id)) missing.push(id);
    }
  }

  if (productIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("product")
      .select("id, price_gross, vat_rate")
      .in("id", productIds)
      .eq("company_id", companyId)
      .eq("active", true);

    if (error) {
      throw new RepositoryError("Failed to load product prices", { cause: error });
    }

    for (const row of data ?? []) {
      products.set(row.id, {
        id: row.id,
        priceGross: Number(row.price_gross),
        vatRate: row.vat_rate == null ? 0 : Number(row.vat_rate),
      });
    }
    for (const id of productIds) {
      if (!products.has(id)) missing.push(id);
    }
  }

  return { variants, products, missing };
}
