import type { Metadata } from "next";
import { isValidCompanyId, isValidSlug, isValidUuid } from "@/lib/constants";
import { isReservedPublicSlug } from "@/lib/legal";
import {
  getCompanyById,
  getCompanyBySlug,
  type PublicCompany,
} from "@/lib/supabase/company";
import {
  getPublicLocation,
  type LocationLookup,
  type PublicLocation,
} from "@/lib/supabase/location";

export type RouteKey =
  | { kind: "id"; value: string }
  | { kind: "slug"; value: string };

/** Classify a path segment as uuid or slug. Staff is still resolved by the widget. */
export function classifyRouteKey(value: string): RouteKey | null {
  if (isValidUuid(value)) {
    return { kind: "id", value };
  }
  if (isValidSlug(value)) {
    return { kind: "slug", value };
  }
  return null;
}

export function locationEmbedFromKey(key: RouteKey): {
  preselectedLocationId?: string;
  preselectedLocationSlug?: string;
} {
  return key.kind === "id"
    ? { preselectedLocationId: key.value }
    : { preselectedLocationSlug: key.value };
}

export function staffEmbedFromKey(key: RouteKey): {
  preselectedStaffIds?: string[];
  preselectedStaffSlugs?: string[];
} {
  return key.kind === "id"
    ? { preselectedStaffIds: [key.value] }
    : { preselectedStaffSlugs: [key.value] };
}

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
  if (isReservedPublicSlug(identifier)) {
    return null;
  }
  if (isValidCompanyId(identifier)) {
    return getCompanyById(identifier);
  }
  if (isValidSlug(identifier)) {
    return getCompanyBySlug(identifier);
  }
  return null;
}

export type LocationPin =
  | { status: "invalid" }
  | { status: "found"; location: PublicLocation; key: RouteKey }
  | { status: "missing" }
  | { status: "unavailable" };

/** Verify a location path pin via anon `location` SELECT (no new RPC). */
export async function resolveLocationPin(
  companyId: string,
  locationKey: string,
): Promise<LocationPin> {
  const key = classifyRouteKey(locationKey);
  if (!key) {
    return { status: "invalid" };
  }

  const lookup: LocationLookup = await getPublicLocation({
    companyId,
    locationId: key.kind === "id" ? key.value : undefined,
    locationSlug: key.kind === "slug" ? key.value : undefined,
  });

  if (lookup.status === "found") {
    return { status: "found", location: lookup.location, key };
  }

  return lookup;
}

export function companyPathSegment(company: PublicCompany): string {
  return company.slug || company.id;
}

export function locationPathSegment(location: PublicLocation): string {
  return location.slug || location.id;
}

export function buildBookingPath(
  company: PublicCompany,
  location?: PublicLocation,
  staffKey?: string,
): string {
  const parts = [companyPathSegment(company)];
  if (location) {
    parts.push(locationPathSegment(location));
  }
  if (staffKey) {
    parts.push(staffKey);
  }
  return `/${parts.join("/")}`;
}

export function unverifiedLocationMetadata(company: PublicCompany): Metadata {
  return {
    title: `Locatie niet gevonden | ${company.name}`,
    robots: { index: false, follow: false },
  };
}

export function buildCompanyMetadata(
  company: PublicCompany,
  options?: { location?: PublicLocation; staffKey?: string },
): Metadata {
  const locationName = options?.location?.name?.trim();
  const title = locationName
    ? `Boek een afspraak bij ${company.name} — ${locationName}`
    : `Boek een afspraak bij ${company.name}`;
  const description =
    company.description ?? `Boek een afspraak bij ${company.name}.`;
  const images = company.image_url ? [{ url: company.image_url }] : undefined;
  const canonical = buildBookingPath(
    company,
    options?.location,
    options?.staffKey,
  );

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
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
