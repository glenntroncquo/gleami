import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export type PublicLocation = {
  id: string;
  name: string;
  slug?: string | null;
  company_id: string;
};

export type LocationLookup =
  | { status: "found"; location: PublicLocation }
  | { status: "missing" }
  | { status: "unavailable" };

/**
 * Public location pin via existing anon RLS SELECT on `location`.
 * No edge function — Glenn bans new public RPCs.
 */
export async function getPublicLocation(args: {
  companyId: string;
  locationId?: string;
  locationSlug?: string;
}): Promise<LocationLookup> {
  const locationId = args.locationId?.trim();
  const locationSlug = args.locationSlug?.trim();
  if (!SUPABASE_ANON_KEY || !args.companyId || (!locationId && !locationSlug)) {
    return { status: "unavailable" };
  }

  const params = new URLSearchParams();
  params.set("select", "id,name,slug,company_id");
  params.set("company_id", `eq.${args.companyId}`);
  if (locationId) {
    params.set("id", `eq.${locationId}`);
  } else if (locationSlug) {
    params.set("slug", `eq.${locationSlug}`);
  }
  params.set("limit", "1");

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/location?${params.toString()}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      return { status: "unavailable" };
    }

    const rows = (await response.json()) as PublicLocation[];
    const location = rows[0];
    if (!location?.id || location.company_id !== args.companyId) {
      return { status: "missing" };
    }

    return { status: "found", location };
  } catch {
    return { status: "unavailable" };
  }
}
