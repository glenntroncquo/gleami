import { supabase } from '@/lib/supabase';

export type ProductTaxonomyRow = {
  id: string;
  name: string | null;
};

export type ManagedProduct = {
  id: string;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  cost_price: number | null;
  price_net: number | null;
  price_gross: number | null;
  vat_rate: number | null;
  stock_qty: number | null;
  active: boolean | null;
  product_category_id: string | null;
  product_line_id: string | null;
  product_category: ProductTaxonomyRow | null;
  product_line: ProductTaxonomyRow | null;
};

export type ProductFields = {
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  costPrice: number | null;
  priceGross: number;
  priceNet: number;
  vatRate: number;
  stockQty: number;
  active: boolean;
  productCategoryId: string | null;
  productLineId: string | null;
};

const MANAGED_PRODUCT_SELECT = `
  id, name, sku, barcode, description, cost_price, price_net, price_gross, vat_rate,
  stock_qty, active, product_category_id, product_line_id,
  product_category:product_category_id ( id, name ),
  product_line:product_line_id ( id, name )
`;

export async function fetchProducts(companyId: string): Promise<ManagedProduct[]> {
  const { data, error } = await supabase
    .from('product')
    .select(MANAGED_PRODUCT_SELECT)
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as ManagedProduct[] | null) ?? [];
}

export async function fetchProduct(productId: string): Promise<ManagedProduct | null> {
  const { data, error } = await supabase
    .from('product')
    .select(MANAGED_PRODUCT_SELECT)
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ManagedProduct | null;
}

export async function findProductByBarcode(companyId: string, barcode: string): Promise<ManagedProduct | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('product')
    .select(MANAGED_PRODUCT_SELECT)
    .eq('company_id', companyId)
    .eq('barcode', trimmed)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ManagedProduct | null;
}

export async function createProduct(companyId: string, fields: ProductFields): Promise<ManagedProduct> {
  const { data, error } = await supabase
    .from('product')
    .insert({
      company_id: companyId,
      name: fields.name,
      sku: fields.sku,
      barcode: fields.barcode,
      description: fields.description,
      cost_price: fields.costPrice,
      price_gross: fields.priceGross,
      price_net: fields.priceNet,
      vat_rate: fields.vatRate,
      stock_qty: fields.stockQty,
      active: fields.active,
      product_category_id: fields.productCategoryId,
      product_line_id: fields.productLineId,
      created_at: new Date().toISOString(),
    })
    .select(MANAGED_PRODUCT_SELECT)
    .single();

  if (error) throw error;
  return data as unknown as ManagedProduct;
}

export async function updateProduct(productId: string, fields: ProductFields): Promise<void> {
  const { error } = await supabase
    .from('product')
    .update({
      name: fields.name,
      sku: fields.sku,
      barcode: fields.barcode,
      description: fields.description,
      cost_price: fields.costPrice,
      price_gross: fields.priceGross,
      price_net: fields.priceNet,
      vat_rate: fields.vatRate,
      stock_qty: fields.stockQty,
      active: fields.active,
      product_category_id: fields.productCategoryId,
      product_line_id: fields.productLineId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) throw error;
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('product').delete().eq('id', productId);
  if (error) throw error;
}

export async function fetchProductCategories(): Promise<ProductTaxonomyRow[]> {
  const { data, error } = await supabase
    .from('product_category')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as ProductTaxonomyRow[] | null) ?? [];
}

export async function fetchProductLines(companyId: string): Promise<ProductTaxonomyRow[]> {
  const { data, error } = await supabase
    .from('product_line')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as unknown as ProductTaxonomyRow[] | null) ?? [];
}

export async function createProductLine(companyId: string, name: string): Promise<ProductTaxonomyRow> {
  const { data, error } = await supabase
    .from('product_line')
    .insert({
      company_id: companyId,
      name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name')
    .single();

  if (error) throw error;
  return data as unknown as ProductTaxonomyRow;
}
