import type { Database } from "@/types/database";
import type { Product, ProductCategory, ProductLine } from "./entity.ts";

type ProductRow = Database["public"]["Tables"]["product"]["Row"];
type ProductCategoryRow = Database["public"]["Tables"]["product_category"]["Row"];
type ProductLineRow = Database["public"]["Tables"]["product_line"]["Row"];

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    companyId: row.company_id,
    productCategoryId: row.product_category_id,
    productLineId: row.product_line_id,
    name: row.name,
    description: row.description,
    sku: row.sku,
    barcode: row.barcode,
    active: row.active,
    costPrice: row.cost_price,
    priceNet: row.price_net,
    priceGross: row.price_gross,
    vatRate: row.vat_rate,
    stockQty: row.stock_qty,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toProductCategory(row: ProductCategoryRow): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toProductLine(row: ProductLineRow): ProductLine {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
