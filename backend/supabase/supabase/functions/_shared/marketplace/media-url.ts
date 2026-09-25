/** Public object URL for a name in the marketplace bucket. */
export function publicMarketplaceImageUrl(storagePath: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const encoded = storagePath.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${base}/storage/v1/object/public/marketplace/${encoded}`;
}

/**
 * Up to five gallery URLs. When the location has no IMAGE media, the card
 * falls back to [imageUrl]. A null imageUrl with no media is an empty list.
 */
export function searchCardImages(
  storagePaths: string[] | null | undefined,
  imageUrl: string | null,
  supabaseUrl: string,
): string[] {
  const gallery = (storagePaths ?? [])
    .filter((path) => path.length > 0)
    .slice(0, 5)
    .map((path) => publicMarketplaceImageUrl(path, supabaseUrl));
  if (gallery.length > 0) return gallery;
  return imageUrl ? [imageUrl] : [];
}
