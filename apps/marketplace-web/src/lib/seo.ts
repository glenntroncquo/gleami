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
  image?: string;
  index?: boolean;
  type?: "website" | "article";
  alternateLocales?: readonly Locale[];
};

export function createPageMetadata({
  locale,
  route,
  title,
  description,
  image = DEFAULT_SOCIAL_IMAGE,
  index = true,
  type = "website",
  alternateLocales = locales,
}: PageMetadataInput): Metadata {
  const canonical = canonicalUrl(locale, route);
  const config = localeConfig[locale];
  const imageUrl = image.startsWith("http") ? image : absoluteUrl(image);

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
      title,
      description,
      url: canonical,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
