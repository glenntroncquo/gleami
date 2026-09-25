export interface VariantSource {
  id: string;
  displayOrder: number | null;
  isActive: boolean | null;
  isDeleted: boolean | null;
}

export interface ServiceSource {
  id: string;
  name: string;
  isActive: boolean | null;
  isDeleted: boolean | null;
  isMarketplaceVisible: boolean;
  categoryIds: string[];
  variants: VariantSource[];
}

export interface CategoryName {
  id: string;
  name: string;
}

export interface LocationSource {
  id: string;
  companyId: string;
  name: string;
  slug: string | null;
  imageUrl: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  isListed: boolean;
  isActive: boolean;
  hasCoordinates: boolean;
  likeCount: number;
  services: ServiceSource[];
  categories: CategoryName[];
}

export interface TreatmentDocument {
  serviceId: string;
  serviceVariantId: string;
  name: string;
}

export interface ProjectionDocument {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  city: string | null;
  address: string | null;
  categoryIds: string[];
  searchText: string;
  treatments: TreatmentDocument[];
  likeCount: number;
}

/** Plan column `address`: street and postal code. City stays its own column. */
export function formatAddress(street: string | null, postalCode: string | null): string | null {
  const parts = [street, postalCode]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function isLive(isActive: boolean | null, isDeleted: boolean | null): boolean {
  return isActive !== false && isDeleted !== true;
}

/** First active variant: lowest display_order, then lowest id. */
export function pickDefaultVariant(variants: VariantSource[]): VariantSource | null {
  const active = variants.filter((variant) => isLive(variant.isActive, variant.isDeleted));
  active.sort((a, b) => {
    const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return active[0] ?? null;
}

export function buildSearchText(parts: {
  name: string;
  city: string | null;
  categoryNames: string[];
  serviceNames: string[];
}): string {
  return [parts.name, parts.city ?? "", ...parts.categoryNames, ...parts.serviceNames]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Pure projection builder. Returns null when the location must not be indexed
 * (unlisted, inactive, blank slug, or no geo_location). Callers delete the
 * projection row in that case. Coordinates are copied from the location row
 * in SQL; this function only decides whether they exist.
 */
export function buildMarketplaceSearchDocument(source: LocationSource): ProjectionDocument | null {
  const slug = source.slug?.trim() ?? "";
  if (!source.isListed || !source.isActive || slug.length === 0 || !source.hasCoordinates) {
    return null;
  }

  const categoryNamesById = new Map(source.categories.map((category) => [category.id, category.name]));
  const categoryIds = new Set<string>();
  const treatments: TreatmentDocument[] = [];
  const serviceNames: string[] = [];

  for (const service of source.services) {
    if (!service.isMarketplaceVisible || !isLive(service.isActive, service.isDeleted)) continue;
    const variant = pickDefaultVariant(service.variants);
    if (!variant) continue;

    treatments.push({
      serviceId: service.id,
      serviceVariantId: variant.id,
      name: service.name,
    });
    serviceNames.push(service.name);
    for (const categoryId of service.categoryIds) {
      if (categoryNamesById.has(categoryId)) categoryIds.add(categoryId);
    }
  }

  const usedCategoryNames = [...categoryIds]
    .map((id) => categoryNamesById.get(id) ?? "")
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b));

  return {
    locationId: source.id,
    companyId: source.companyId,
    name: source.name,
    slug,
    imageUrl: source.imageUrl,
    city: source.city,
    address: formatAddress(source.street, source.postalCode),
    categoryIds: [...categoryIds].sort(),
    searchText: buildSearchText({
      name: source.name,
      city: source.city,
      categoryNames: usedCategoryNames,
      serviceNames,
    }),
    treatments,
    likeCount: source.likeCount,
  };
}
