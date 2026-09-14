import { permanentRedirect } from "next/navigation";
import { localizedServiceCatalogPath } from "@/lib/api/catalog/service-catalog-path";

export default async function LegacyTreatmentRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(localizedServiceCatalogPath(locale));
}
