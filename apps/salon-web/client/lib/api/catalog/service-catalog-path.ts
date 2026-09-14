/** Staff catalog lives at /service. Leftover /treatment bookmarks redirect here. */
export const SERVICE_CATALOG_PATH = "/service";
export const LEGACY_TREATMENT_CATALOG_PATH = "/treatment";

export function localizedServiceCatalogPath(locale: string): string {
  return `/${locale}${SERVICE_CATALOG_PATH}`;
}

export function localizedLegacyTreatmentPath(locale: string): string {
  return `/${locale}${LEGACY_TREATMENT_CATALOG_PATH}`;
}
