import type { Metadata } from "next";
import { ConsumerHome } from "@/components/consumer-home/ConsumerHome";
import { JsonLd } from "@/components/seo/JsonLd";
import { launchLocales } from "@/lib/i18n";
import {
  createPageMetadata,
  HOME_SOCIAL_IMAGE,
  homeSocialCopy,
} from "@/lib/seo";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  locale: "nl-be",
  route: { kind: "home" },
  title: "Salon boeken in België | Gleami",
  description:
    "Ontdek salons en beautyprofessionals in België. Vergelijk behandelingen en boek jouw volgende afspraak.",
  socialTitle: homeSocialCopy.title,
  socialDescription: homeSocialCopy.description,
  image: HOME_SOCIAL_IMAGE,
  alternateLocales: launchLocales,
});

export default function RootPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd("nl-be")]} />
      <ConsumerHome />
    </>
  );
}
