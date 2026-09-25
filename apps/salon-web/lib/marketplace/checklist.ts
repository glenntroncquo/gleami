import { normalizeSlug } from "./slug";

export const PUBLISH_CHECKLIST_IDS = [
  "slug",
  "address",
  "coordinates",
  "service",
  "photo",
] as const;

export type PublishChecklistId = (typeof PUBLISH_CHECKLIST_IDS)[number];

export type PublishChecklistItem = {
  id: PublishChecklistId;
  done: boolean;
  /** Only a missing slug blocks is_listed. The rest are warnings. */
  blocking: boolean;
};

export type PublishChecklistInput = {
  slug: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  hasCoordinates: boolean;
  /** Active, marketplace-visible services that have at least one category. */
  visibleCategorisedServiceCount: number;
  photoCount: number;
};

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

export function buildPublishChecklist(input: PublishChecklistInput): PublishChecklistItem[] {
  const slugDone = normalizeSlug(input.slug ?? "").length > 0;
  const addressDone = filled(input.street) && filled(input.postalCode) && filled(input.city);
  const serviceDone = input.visibleCategorisedServiceCount >= 1;
  const photoDone = input.photoCount >= 1;

  return [
    { id: "slug", done: slugDone, blocking: true },
    { id: "address", done: addressDone, blocking: false },
    { id: "coordinates", done: input.hasCoordinates, blocking: false },
    { id: "service", done: serviceDone, blocking: false },
    { id: "photo", done: photoDone, blocking: false },
  ];
}

/** A location can be listed when every blocking item is done. */
export function canListLocation(items: PublishChecklistItem[]): boolean {
  return items.every((item) => !item.blocking || item.done);
}
