export type LocationRecord = {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  email: string | null;
  image_url: string | null;
  timezone: string;
  is_primary: boolean;
  is_listed: boolean;
  is_active: boolean;
};

export type LocationWrite = {
  name: string;
  slug?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postal_code?: string | null;
  street?: string | null;
  email?: string | null;
  timezone?: string;
  is_active?: boolean;
};

export type MultiLocationFlag = {
  enabled: boolean;
  /** False when company.multi_location_enabled is not on this backend yet. */
  columnPresent: boolean;
};

export const DEFAULT_LOCATION_TIMEZONE = "Europe/Brussels";

export const LOCATION_SELECT =
  "id, company_id, name, slug, country, state, city, postal_code, street, email, image_url, timezone, is_primary, is_listed, is_active";
