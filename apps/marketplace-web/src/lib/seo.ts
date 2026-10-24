import type { Metadata } from "next";
import {
  defaultLocale,
  localeConfig,
  locales,
  routeFor,
  type Locale,
  type RouteDescriptor,
} from "@/lib/i18n";

export const SITE_NAME = "Gleami";
export const SITE_ORIGIN = normalizeOrigin(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://gleami.eu",
);
export const DEFAULT_SOCIAL_IMAGE =
  "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg";

export type SocialImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

/** Dutch homepage card. The picture text is Belgium-specific. */
export const HOME_SOCIAL_IMAGE: SocialImage = {
  url: "/og/home.jpg",
  width: 1024,
  height: 535,
  alt: "Vind je salon. Boek wanneer je wil.",
};

/** Dutch business card. Headline matches the voor-salons page. */
export const BUSINESS_SOCIAL_IMAGE: SocialImage = {
  url: "/og/business.jpg",
  width: 1024,
  height: 535,
  alt: "Alles wat je salon nodig heeft. Op één plek.",
};

export const homeSocialCopy = {
  title: "Vind je salon. Boek wanneer je wil.",
  description: "Kapper, nagels en massage in België.",
} as const;

export const businessSocialCopy = {
  title: "Alles wat je salon nodig heeft. Op één plek.",
  description: "Afspraken, klanten en betalingen. Eén helder platform.",
} as const;

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://gleami.eu";
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

export function canonicalUrl(
  locale: Locale,
  route: RouteDescriptor,
): string {
  return absoluteUrl(routeFor(locale, route));
}

export function languageAlternates(
  route: RouteDescriptor,
  alternateLocales: readonly Locale[] = locales,
): Record<string, string> {
  const languages = Object.fromEntries(
    alternateLocales.map((locale) => [
      localeConfig[locale].hreflang,
      canonicalUrl(locale, route),
    ]),
  );
  const xDefaultLocale = alternateLocales.includes(defaultLocale)
    ? defaultLocale
    : alternateLocales[0] ?? defaultLocale;

  return {
    ...languages,
    "x-default": canonicalUrl(xDefaultLocale, route),
  };
}

type PageMetadataInput = {
  locale: Locale;
  route: RouteDescriptor;
  title: string;
  description: string;
  /** Preview title. Defaults to the document title. */
  socialTitle?: string;
  /** Preview description. Defaults to the document description. */
  socialDescription?: string;
  image?: string | SocialImage;
  index?: boolean;
  type?: "website" | "article";
  alternateLocales?: readonly Locale[];
};

export function createPageMetadata({
  locale,
  route,
  title,
  description,
  socialTitle = title,
  socialDescription = description,
  image = DEFAULT_SOCIAL_IMAGE,
  index = true,
  type = "website",
  alternateLocales = locales,
}: PageMetadataInput): Metadata {
  const canonical = canonicalUrl(locale, route);
  const config = localeConfig[locale];
  const socialImage: SocialImage =
    typeof image === "string"
      ? { url: image, width: 1200, height: 630, alt: socialTitle }
      : image;
  const imageUrl = socialImage.url.startsWith("http")
    ? socialImage.url
    : absoluteUrl(socialImage.url);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
      languages: languageAlternates(route, alternateLocales),
    },
    robots: {
      index,
      follow: true,
      googleBot: {
        index,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: config.hreflang.replace("-", "_"),
      alternateLocale: locales
        .filter((item) => item !== locale)
        .map((item) => localeConfig[item].hreflang.replace("-", "_")),
      title: socialTitle,
      description: socialDescription,
      url: canonical,
      images: [
        {
          url: imageUrl,
          width: socialImage.width,
          height: socialImage.height,
          alt: socialImage.alt,
          type: imageUrl.includes(".jpg") ? "image/jpeg" : undefined,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [imageUrl],
    },
  };
}

export function truncateDescription(value: string, max = 158): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  const shortened = normalized.slice(0, max - 1);
  const finalSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, Math.max(finalSpace, max - 24))}…`;
}
