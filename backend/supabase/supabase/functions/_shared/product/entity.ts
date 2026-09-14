export interface Product {
  id: string;
  companyId: string;
  productCategoryId: string | null;
  productLineId: string | null;
  name: string | null;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  active: boolean | null;
  costPrice: number | null;
  priceNet: number | null;
  priceGross: number | null;
  vatRate: number | null;
  stockQty: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductCategory {
  id: string;
  name: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ProductLine {
  id: string;
  companyId: string | null;
  name: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string | null;
}
