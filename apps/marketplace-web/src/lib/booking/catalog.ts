export type CatalogService = {
  serviceId: string;
  name: string;
  variants: Array<{
    serviceVariantId: string;
    name: string;
    price: number;
    durationMinutes: number;
  }>;
};

export type CatalogItem = {
  service: CatalogService;
  variant: CatalogService["variants"][number];
};

export type CatalogCategory = {
  id: string;
  name: string;
  items: CatalogItem[];
};

export const RECOMMENDED_ID = "recommended";
const RECOMMENDED_MAX = 8;

export function itemKey(item: CatalogItem): string {
  return `${item.service.serviceId}:${item.variant.serviceVariantId}`;
}

export function buildCatalog(services: CatalogService[]): CatalogCategory[] {
  const categories: CatalogCategory[] = services
    .filter((service) => service.variants.length > 0)
    .map((service) => ({
      id: service.serviceId,
      name: service.name,
      items: service.variants.map((variant) => ({ service, variant })),
    }));

  if (categories.length < 2) return categories;

  const leading = categories.map((category) => category.items[0]!);
  const rest = categories.flatMap((category) => category.items.slice(1));
  return [
    {
      id: RECOMMENDED_ID,
      name: "Aanbevolen",
      items: [...leading, ...rest].slice(0, RECOMMENDED_MAX),
    },
    ...categories,
  ];
}

export function totalPrice(items: CatalogItem[]): number {
  return items.reduce((sum, item) => sum + item.variant.price, 0);
}

export function totalMinutes(items: CatalogItem[]): number {
  return items.reduce((sum, item) => sum + item.variant.durationMinutes, 0);
}
