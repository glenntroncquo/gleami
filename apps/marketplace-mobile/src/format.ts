export function formatDistance(km: number | null): string | null {
  if (km == null || Number.isNaN(km)) return null;
  if (km < 1) {
    return `${Math.max(1, Math.round(km * 1000))} m`;
  }
  return `${new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 1 }).format(km)} km`;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat('nl-BE').format(count);
}

export function cityLine(city: string, distanceKm: number | null): string {
  const distance = formatDistance(distanceKm);
  if (!city) return distance ?? '';
  if (!distance) return city;
  return `${city} · ${distance}`;
}
