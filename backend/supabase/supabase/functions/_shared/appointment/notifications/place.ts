import { SALON_TIMEZONE } from "../../time/salon-timezone.ts";

export interface CompanyContact {
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  email?: string | null;
}

export interface LocationContact {
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  email?: string | null;
  timezone?: string | null;
}

export interface NotificationPlace {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  email: string;
  timezone: string;
}

function nonempty(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Location fields win when set; each empty location field falls back to company. */
export function resolveNotificationPlace(
  company: CompanyContact,
  location?: LocationContact | null,
): NotificationPlace {
  return {
    street: nonempty(location?.street) ?? nonempty(company.street) ?? "",
    city: nonempty(location?.city) ?? nonempty(company.city) ?? "",
    postalCode: nonempty(location?.postal_code) ?? nonempty(company.postal_code) ?? "",
    country: nonempty(location?.country) ?? nonempty(company.country) ?? "",
    email: nonempty(location?.email) ?? nonempty(company.email) ?? "",
    timezone: nonempty(location?.timezone) ?? SALON_TIMEZONE,
  };
}

export function placeToEmailAddress(place: NotificationPlace) {
  return {
    companyStreet: place.street,
    companyCity: place.city,
    companyPostalCode: place.postalCode,
    companyCountry: place.country,
  };
}

/** Salon inbox plus the booked staff member. Same address is sent once. */
export function staffNotificationRecipients(
  placeEmail?: string | null,
  staffEmail?: string | null,
): string[] {
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const raw of [placeEmail, staffEmail]) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) continue;
    seen.add(key);
    recipients.push(trimmed);
  }
  return recipients;
}
