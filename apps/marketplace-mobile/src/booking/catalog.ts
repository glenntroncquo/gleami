/**
 * Turns the salon's services into the category rows the picker shows.
 * A `service` is the category ("Haar") and a `service_variant` is the row
 * inside it ("Haar knippen", 30 min, € 25) — there is no category column
 * in the backend, so "Aanbevolen" is built here.
 */
import type { LocationService, ServiceVariant } from '@/src/api/types';
import { t } from '@/src/i18n';

export type CatalogItem = {
  service: LocationService;
  variant: ServiceVariant;
};

export type CatalogCategory = {
  id: string;
  name: string;
  items: CatalogItem[];
};

export const RECOMMENDED_ID = 'recommended';

/** Enough to fill the first screen without turning into a second full list. */
const RECOMMENDED_MAX = 8;

export function itemKey(item: CatalogItem): string {
  return `${item.service.serviceId}:${item.variant.serviceVariantId}`;
}

/**
 * One category per service, plus a leading "Aanbevolen" that takes the first
 * variant of every service and then tops up in catalog order. The recommended
 * row is skipped for single-category salons, where it would just repeat.
 */
export function buildCatalog(services: LocationService[]): CatalogCategory[] {
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
      name: t('booking.recommended'),
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

/** Display name for a row: variants are often named after their parent service. */
export function itemName(item: CatalogItem): string {
  const name = item.variant.name.trim();
  if (!name || name === item.service.name.trim()) return item.service.name;
  return name;
}

/**
 * Full label for summaries, where there is no category heading to lean on.
 * A bare variant ("Kort") is meaningless once it leaves its list.
 */
export function itemLabel(item: CatalogItem): string {
  const variant = itemName(item);
  if (variant === item.service.name) return variant;
  return `${item.service.name} · ${variant}`;
}

export function findItem(services: LocationService[], variantId: string): CatalogItem | null {
  for (const service of services) {
    const variant: ServiceVariant | undefined = service.variants.find(
      (candidate) => candidate.serviceVariantId === variantId,
    );
    if (variant) return { service, variant };
  }
  return null;
}
