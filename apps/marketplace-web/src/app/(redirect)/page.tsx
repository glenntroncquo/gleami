import type { Metadata } from "next";
import { FreshaHome } from "@/components/marketplace/FreshaHome";
import { JsonLd } from "@/components/seo/JsonLd";
import { createPageMetadata } from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  locale: "nl-be",
  route: { kind: "home" },
  title: "Boek beauty en wellness bij jou in de buurt | Gleami",
  description:
    "Ontdek salons en beautyprofessionals bij jou in de buurt. Vergelijk behandelingen en boek jouw volgende afspraak.",
});

export default function RootPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd("nl-be")]} />
      <FreshaHome />
    </>
  );
}
