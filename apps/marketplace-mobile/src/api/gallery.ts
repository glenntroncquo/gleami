/**
 * Card galleries match `searchCardImages` in the marketplace edge:
 * at most five public URLs, cover first. A location with no IMAGE media
 * has an empty gallery. The salon profile picture is never used.
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
export function cardGallery(storagePaths: string[], supabaseUrl: string): string[] {
  return storagePaths
    .filter((path) => path.length > 0)
    .slice(0, SEARCH_CARD_IMAGE_LIMIT)
    .map((path) => publicMarketplaceImageUrl(path, supabaseUrl));
}

/** Marketplace photos already resolved to public URLs. */
export function galleryFromItem(images: string[] | null | undefined): string[] {
  return (images ?? []).filter((url) => url.length > 0).slice(0, SEARCH_CARD_IMAGE_LIMIT);
}
