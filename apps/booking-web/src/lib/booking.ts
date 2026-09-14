import type { Metadata } from "next";
import { isValidCompanyId, isValidSlug } from "@/lib/constants";
import {
  getCompanyById,
  getCompanyBySlug,
  type PublicCompany,
} from "@/lib/supabase/company";

export function parseList(value?: string | string[]): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function resolveCompany(
  identifier: string,
): Promise<PublicCompany | null> {
  if (isValidCompanyId(identifier)) {
    return getCompanyById(identifier);
  }
  if (isValidSlug(identifier)) {
    return getCompanyBySlug(identifier);
  }
  return null;
}

export function buildCompanyMetadata(company: PublicCompany): Metadata {
  const title = `Boek een afspraak bij ${company.name}`;
  const description =
    company.description ?? `Boek een afspraak bij ${company.name}.`;
  const images = company.image_url ? [{ url: company.image_url }] : undefined;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: company.image_url ? [company.image_url] : undefined,
    },
  };
}
