import { localeConfig, type Locale } from "@/lib/i18n";

export type CitySuggestion = {
  id: string;
  name: string;
  place: string;
};

export type MapPoint = {
  lng: number;
  lat: number;
};

const proximity = {
  BE: "4.3517,50.8503",
  NL: "4.9041,52.3676",
  FR: "2.3522,48.8566",
  DE: "13.405,52.52",
} as const;

type SuggestResponse = {
  suggestions?: {
    mapbox_id: string;
    name: string;
    place_formatted?: string;
    full_address?: string;
  }[];
};

export async function suggestCities(
  locale: Locale,
  query: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing Mapbox token");

  const { country, language } = localeConfig[locale];
  const params = new URLSearchParams({
    q: query,
    access_token: token,
    session_token: sessionToken,
    country,
    language,
    types: "place,locality",
    limit: "6",
    proximity: proximity[country],
  });
  const response = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`,
    { signal },
  );
  if (!response.ok) throw new Error("Mapbox suggest failed");
  const data = (await response.json()) as SuggestResponse;
  return (data.suggestions ?? []).map((item) => ({
    id: item.mapbox_id,
    name: item.name,
    place: item.place_formatted ?? item.full_address ?? "",
  }));
}

type RetrieveResponse = {
  features?: { geometry?: { coordinates?: [number, number] } }[];
};

export async function retrieveCity(
  id: string,
  sessionToken: string,
): Promise<MapPoint | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  const params = new URLSearchParams({
    access_token: token,
    session_token: sessionToken,
  });
  const response = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(id)}?${params}`,
  );
  if (!response.ok) throw new Error("Mapbox retrieve failed");
  const data = (await response.json()) as RetrieveResponse;
  const coordinates = data.features?.[0]?.geometry?.coordinates;
  if (!coordinates) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}
