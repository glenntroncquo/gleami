import type { Metadata } from "next";
import { ExactBusinessWebsite } from "@/components/business/ExactBusinessWebsite";
import { absoluteUrl, DEFAULT_SOCIAL_IMAGE } from "@/lib/seo";

const title = "Salon software that brings everything together | Gleami";
const description =
  "Manage appointments, clients, staff, payments and more with one beautifully simple salon platform.";
const canonical = absoluteUrl("/for-businesses");
const image = absoluteUrl(DEFAULT_SOCIAL_IMAGE);

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "Gleami",
    title,
    description,
    url: canonical,
    images: [{ url: image, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
};

export default function ForBusinessesPage() {
  return (
    <div lang="en">
      <ExactBusinessWebsite />
    </div>
  );
}
