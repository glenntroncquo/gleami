/**
 * Card galleries match `searchCardImages` in the marketplace edge:
 * at most five public URLs, cover first. When a location has no IMAGE
 * media, the list is `[imageUrl]` or empty.
 */
export const SEARCH_CARD_IMAGE_LIMIT = 5;

export function publicMarketplaceImageUrl(storagePath: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  const encoded = storagePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${base}/storage/v1/object/public/marketplace/${encoded}`;
}

/** Paths from marketplace_media, already ordered by sort_order then id. */
export function cardGallery(
  storagePaths: string[],
  imageUrl: string | null,
  supabaseUrl: string,
): string[] {
  const gallery = storagePaths
    .filter((path) => path.length > 0)
    .slice(0, SEARCH_CARD_IMAGE_LIMIT)
    .map((path) => publicMarketplaceImageUrl(path, supabaseUrl));
  if (gallery.length > 0) return gallery;
  return imageUrl ? [imageUrl] : [];
}

/** Normalize a search or favorites payload. Prefer `images`, then `imageUrl`. */
export function galleryFromItem(
  images: string[] | null | undefined,
  imageUrl: string | null | undefined,
): string[] {
  const gallery = (images ?? []).filter((url) => url.length > 0).slice(0, SEARCH_CARD_IMAGE_LIMIT);
  if (gallery.length > 0) return gallery;
  return imageUrl ? [imageUrl] : [];
}
