/** Public object URL for a name in the marketplace bucket. */
export function publicMarketplaceImageUrl(storagePath: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  const encoded = storagePath.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `${base}/storage/v1/object/public/marketplace/${encoded}`;
}

/** Up to five marketplace gallery URLs. The location profile picture is never included. */
export function searchCardImages(
  storagePaths: string[] | null | undefined,
  supabaseUrl: string,
): string[] {
  return (storagePaths ?? [])
    .filter((path) => path.length > 0)
    .slice(0, 5)
    .map((path) => publicMarketplaceImageUrl(path, supabaseUrl));
}
