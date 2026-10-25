import type { SalonSearchCard, SalonService } from "@/data/marketplace";
import type { MapPoint } from "@/lib/places";

export type SearchArea = { west: number; south: number; east: number; north: number };
export type SalonSort = "recommended" | "rating" | "price";

export function normalized(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function distanceKm(from: MapPoint, latitude: number, longitude: number): number {
  const radians = Math.PI / 180;
  const lat = (latitude - from.lat) * radians;
  const lng = (longitude - from.lng) * radians;
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(from.lat * radians) * Math.cos(latitude * radians) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function filterSalons(
  salons: SalonSearchCard[],
  { query, category, sort, place, area }: {
    query: string;
    category: string | null;
    sort: SalonSort;
    place: MapPoint | null;
    area: SearchArea | null;
  },
): SalonSearchCard[] {
  const words = normalized(query).split(/\s+/).filter(Boolean);
  const matches = salons.filter((salon) => {
    if (category && !salon.categories.some((item) => item.id === category)) return false;
    if (area) {
      if (salon.latitude == null || salon.longitude == null) return false;
      if (
        salon.latitude < area.south || salon.latitude > area.north ||
        salon.longitude < area.west || salon.longitude > area.east
      ) return false;
    }
    const haystack = normalized([
      salon.name, salon.city, salon.address,
      ...salon.treatmentNames,
      ...salon.categories.map((item) => item.name),
      ...salon.services.flatMap((item) => [item.name, ...item.variants.map((variant) => variant.name)]),
    ].join(" "));
    return words.every((word) => haystack.includes(word));
  });
  const distance = (salon: SalonSearchCard) =>
    place && salon.latitude != null && salon.longitude != null
      ? distanceKm(place, salon.latitude, salon.longitude)
      : Infinity;
  return matches.sort((left, right) => {
    if (sort === "price") return (left.minimumPrice ?? Infinity) - (right.minimumPrice ?? Infinity);
    if (sort === "rating") {
      return (right.reviewCount > 0 ? right.rating ?? 0 : 0) -
        (left.reviewCount > 0 ? left.rating ?? 0 : 0) || right.reviewCount - left.reviewCount;
    }
    return place ? distance(left) - distance(right) : 0;
  });
}

export function previewServices(services: SalonService[], query: string): SalonService[] {
  const needle = normalized(query);
  return [...services]
    .sort((left, right) => {
      if (!needle) return 0;
      return Number(normalized(right.name).includes(needle)) - Number(normalized(left.name).includes(needle));
    })
    .slice(0, 3);
}

export type ExplorerWhenPart = "any" | "morning" | "afternoon" | "evening";

export type ExplorerSearch = {
  query: string;
  where: string | null;
  lat: number | null;
  lng: number | null;
  date: string | null;
  part: ExplorerWhenPart;
};

const whenParts = new Set<ExplorerWhenPart>(["morning", "afternoon", "evening"]);

export function readExplorerSearch(input: {
  q?: string | null;
  where?: string | null;
  lat?: string | null;
  lng?: string | null;
  date?: string | null;
  part?: string | null;
}): ExplorerSearch {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const where = (input.where ?? "").trim();
  const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : null;
  const part = whenParts.has(input.part as ExplorerWhenPart) ? input.part as ExplorerWhenPart : "any";
  return {
    query: (input.q ?? "").trim(),
    where: hasPoint && where ? where : null,
    lat: hasPoint ? lat : null,
    lng: hasPoint ? lng : null,
    date,
    part,
  };
}

export function serviceSummary(service: SalonService) {
  const prices = service.variants.map((variant) => variant.price).filter((price) => Number.isFinite(price) && price >= 0);
  const durations = service.variants.map((variant) => variant.durationMinutes).filter((duration) => Number.isFinite(duration) && duration > 0);
  return {
    price: prices.length ? Math.min(...prices) : null,
    variablePrice: new Set(prices).size > 1,
    duration: durations.length
      ? [...new Set([Math.min(...durations), Math.max(...durations)])].join("–")
      : null,
  };
}
