import type { SearchItem, SearchTreatment } from '@/src/api/types';

/** Put the treatment whose name contains the query first, so a card leads with it. */
export function promoteMatchingTreatment(treatments: SearchTreatment[], q: string): SearchTreatment[] {
  const needle = q.trim().toLowerCase();
  if (!needle || treatments.length < 2) return treatments;
  const index = treatments.findIndex((treatment) => treatment.name.toLowerCase().includes(needle));
  if (index <= 0) return treatments;
  return [treatments[index], ...treatments.slice(0, index), ...treatments.slice(index + 1)];
}

/** Salon row subtitle: the matching treatment when the query is not the salon name. */
export function salonSuggestionSubtitle(item: SearchItem, q: string): string {
  const needle = q.trim().toLowerCase();
  const treatment = item.treatments.find((entry) => entry.name.toLowerCase().includes(needle))?.name;
  const namedSalon = item.name.toLowerCase().includes(needle);
  if (treatment && !namedSalon) {
    return item.city ? `${treatment} · ${item.city}` : treatment;
  }
  return item.city ? `Salon · ${item.city}` : 'Salon';
}
