import type { SearchItem, SearchTreatment } from '@/src/api/types';

function treatmentMatchScore(name: string, needle: string): number {
  const normalized = name.toLowerCase();
  if (!normalized.includes(needle)) return -1;
  const words = normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 0);
  if (words.some((word) => word === needle)) return 3;
  if (words.some((word) => word.startsWith(needle))) return 2;
  return 1;
}

/** Put the treatment that best matches the query first, so a card leads with it. */
export function promoteMatchingTreatment(treatments: SearchTreatment[], q: string): SearchTreatment[] {
  const needle = q.trim().toLowerCase();
  if (!needle || treatments.length < 2) return treatments;
  let best = -1;
  let bestScore = -1;
  treatments.forEach((treatment, index) => {
    const score = treatmentMatchScore(treatment.name, needle);
    const shorter = best >= 0 && score === bestScore && treatment.name.length < treatments[best].name.length;
    if (score > bestScore || shorter) {
      best = index;
      bestScore = score;
    }
  });
  if (best <= 0 || bestScore < 0) return treatments;
  return [treatments[best], ...treatments.slice(0, best), ...treatments.slice(best + 1)];
}

/** Salon row subtitle: the place, without the treatment that matched the query. */
export function salonSuggestionSubtitle(item: SearchItem): string {
  return item.city ? `Salon · ${item.city}` : 'Salon';
}
