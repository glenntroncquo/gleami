import {
  cityKeyFromName,
  cityNames,
  localeConfig,
  slugify,
  treatmentNames,
  type CityKey,
  type Locale,
  type TreatmentKey,
} from "@/lib/i18n";

export type SalonServiceVariant = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  currency: "EUR";
};

export type SalonService = {
  id: string;
  name: string;
  description: string | null;
  treatmentKeys: TreatmentKey[];
  variants: SalonServiceVariant[];
};

export type SalonTeamMember = {
  id: string;
  name: string;
  role: string | null;
  imageUrl: string | null;
};

export type OpeningHours = {
  day: number;
  opens: string | null;
  closes: string | null;
};

export type SalonReview = {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
};

export type SalonProfile = {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  images: string[];
  street: string | null;
  postalCode: string | null;
  city: string;
  cityKey: CityKey | null;
  countryCode: "BE" | "NL" | "FR" | "DE";
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  services: SalonService[];
  team: SalonTeamMember[];
  openingHours: OpeningHours[];
  reviews: SalonReview[];
  rating: number | null;
  reviewCount: number;
  likeCount: number;
  updatedAt: string;
  source: "live" | "demo";
};

export type SalonCard = Pick<
  SalonProfile,
  | "id"
  | "companyId"
  | "name"
  | "slug"
  | "imageUrl"
  | "images"
  | "city"
  | "cityKey"
  | "countryCode"
  | "rating"
  | "reviewCount"
  | "likeCount"
  | "source"
> & {
  address: string;
  treatmentNames: string[];
  minimumPrice: number | null;
};

type SearchItem = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  images: string[];
  city: string | null;
  address: string;
  lat: number;
  lng: number;
  treatments: Array<{
    serviceId: string;
    serviceVariantId: string;
    name: string;
  }>;
  rating: number | null;
  reviewCount: number;
  likeCount: number;
};

type SearchResponse = {
  items: SearchItem[];
  nextCursor: string | null;
};

type ProjectionRestRow = {
  location_id: string;
  company_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  city: string | null;
  address: string | null;
  treatments: SearchItem["treatments"] | null;
  rating: number | string | null;
  review_count: number | null;
  like_count: number | null;
};

type LocationResponse = {
  location: {
    locationId: string;
    companyId: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    images: string[];
    street: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    lat: number | null;
    lng: number | null;
    timezone: string;
    likeCount: number;
  };
  categories: Array<{ id: string; name: string; slug: string }>;
  services: Array<{
    serviceId: string;
    name: string;
    description: string | null;
    variants: Array<{
      serviceVariantId: string;
      name: string;
      price: number;
      durationMinutes: number;
      currency?: "EUR";
    }>;
  }>;
  team?: SalonTeamMember[];
};

const demoImages = {
  hair: "/c22595c4-33c0-4e1b-9d3b-228dabf74ef8.jpg",
  nails: "/7dffc13d-fe3b-49a8-b10d-0ab518d31b7a.jpg",
  barber: "/bffac2f4-5acb-4c67-b55f-1909523c2416.jpg",
  stylist: "/8ac9a3fa-97f7-4191-ab3a-0564c2356ee1.jpg",
  detail: "/b23af3a5-f1bd-4962-b0c7-fb3d1f6aaeb0.jpg",
};

const standardHours: OpeningHours[] = [
  { day: 1, opens: null, closes: null },
  { day: 2, opens: "09:00", closes: "18:00" },
  { day: 3, opens: "09:00", closes: "18:00" },
  { day: 4, opens: "09:00", closes: "20:00" },
  { day: 5, opens: "09:00", closes: "18:00" },
  { day: 6, opens: "09:00", closes: "17:00" },
  { day: 7, opens: null, closes: null },
];

const service = (
  id: string,
  name: string,
  description: string,
  treatmentKeys: TreatmentKey[],
  variants: Array<[string, number, number]>,
): SalonService => ({
  id,
  name,
  description,
  treatmentKeys,
  variants: variants.map(([variantName, price, durationMinutes], index) => ({
    id: `${id}-${index + 1}`,
    name: variantName,
    price,
    durationMinutes,
    currency: "EUR",
  })),
});

/**
 * Local-only illustrative records used when no public Supabase environment is
 * configured. Their pages always emit noindex and never enter a sitemap.
 */
const demoSalons: SalonProfile[] = [
  {
    id: "demo-atelier-noor",
    companyId: "demo-company-noor",
    name: "Atelier Noor",
    slug: "atelier-noor",
    description:
      "Een lichte, rustige studio met aandacht voor vorm, kleur en verzorging. Het team neemt tijd voor een persoonlijk advies voor elke afspraak.",
    imageUrl: demoImages.hair,
    images: [demoImages.hair, demoImages.stylist, demoImages.detail],
    street: "Veldstraat 41",
    postalCode: "9000",
    city: "Gent",
    cityKey: "ghent",
    countryCode: "BE",
    latitude: 51.0518,
    longitude: 3.7215,
    timezone: "Europe/Brussels",
    categories: [
      { id: "hair", name: "Hair salon", slug: "hair-salon" },
      { id: "colour", name: "Colour", slug: "colour" },
    ],
    services: [
      service(
        "demo-cut",
        "Knippen & brushing",
        "Wassen, persoonlijk knipadvies en een verzorgde finish.",
        ["haircut"],
        [
          ["Kort haar", 52, 50],
          ["Lang haar", 64, 65],
        ],
      ),
      service(
        "demo-balayage",
        "Balayage",
        "Handgeschilderde highlights met zachte overgangen en toner.",
        ["balayage"],
        [
          ["Half hoofd", 145, 135],
          ["Volledig", 195, 180],
        ],
      ),
      service(
        "demo-keratin",
        "Keratinebehandeling",
        "Gladmakende verzorging afgestemd op je haartype.",
        ["keratin"],
        [["Vanaf schouderlengte", 180, 150]],
      ),
    ],
    team: [
      {
        id: "demo-emma",
        name: "Emma",
        role: "Senior stylist",
        imageUrl: null,
      },
      {
        id: "demo-lina",
        name: "Lina",
        role: "Colour specialist",
        imageUrl: null,
      },
    ],
    openingHours: standardHours,
    reviews: [
      {
        id: "demo-review-1",
        author: "Sophie",
        rating: 5,
        date: "2026-08-18",
        text: "Rustige sfeer en een heel duidelijke uitleg voor de behandeling.",
      },
      {
        id: "demo-review-2",
        author: "Amélie",
        rating: 4.8,
        date: "2026-07-09",
        text: "Mooi resultaat en de afspraak begon precies op tijd.",
      },
    ],
    rating: 4.9,
    reviewCount: 128,
    likeCount: 34,
    updatedAt: "2026-09-29T09:00:00.000Z",
    source: "demo",
  },
  {
    id: "demo-studio-lune",
    companyId: "demo-company-lune",
    name: "Studio Lune",
    slug: "studio-lune",
    description:
      "Een minimalistische nagelstudio voor verzorgde manicures, BIAB en subtiele nail art in het centrum van Antwerpen.",
    imageUrl: demoImages.nails,
    images: [demoImages.nails, demoImages.detail],
    street: "Kammenstraat 18",
    postalCode: "2000",
    city: "Antwerpen",
    cityKey: "antwerp",
    countryCode: "BE",
    latitude: 51.216,
    longitude: 4.401,
    timezone: "Europe/Brussels",
    categories: [{ id: "nails", name: "Nail studio", slug: "nail-studio" }],
    services: [
      service(
        "demo-manicure",
        "Gel manicure",
        "Nagelverzorging en gellak in een kleur naar keuze.",
        ["nails"],
        [["Handen", 45, 60]],
      ),
      service(
        "demo-biab",
        "BIAB",
        "Versteviging van de natuurlijke nagel met een zachte finish.",
        ["nails"],
        [
          ["Nieuwe set", 58, 75],
          ["Bijwerking", 48, 60],
        ],
      ),
    ],
    team: [
      {
        id: "demo-julie",
        name: "Julie",
        role: "Nail artist",
        imageUrl: null,
      },
    ],
    openingHours: standardHours,
    reviews: [],
    rating: 4.8,
    reviewCount: 86,
    likeCount: 22,
    updatedAt: "2026-09-27T09:00:00.000Z",
    source: "demo",
  },
  {
    id: "demo-maison-fade",
    companyId: "demo-company-fade",
    name: "Maison Fade",
    slug: "maison-fade",
    description:
      "Een hedendaagse barbershop voor klassieke coupes, fades en baardverzorging in hartje Brussel.",
    imageUrl: demoImages.barber,
    images: [demoImages.barber, demoImages.detail],
    street: "Antoine Dansaertstraat 64",
    postalCode: "1000",
    city: "Brussel",
    cityKey: "brussels",
    countryCode: "BE",
    latitude: 50.85,
    longitude: 4.346,
    timezone: "Europe/Brussels",
    categories: [{ id: "barber", name: "Barber", slug: "barber" }],
    services: [
      service(
        "demo-fade",
        "Skin fade",
        "Strakke fade met contour en styling.",
        ["haircut"],
        [["Standaard", 34, 40]],
      ),
      service(
        "demo-beard",
        "Baard trimmen",
        "Vorm, contour en verzorgende olie.",
        [],
        [["Baard", 22, 25]],
      ),
    ],
    team: [
      {
        id: "demo-lucas",
        name: "Lucas",
        role: "Barber",
        imageUrl: null,
      },
    ],
    openingHours: standardHours,
    reviews: [],
    rating: 4.7,
    reviewCount: 204,
    likeCount: 41,
    updatedAt: "2026-09-25T09:00:00.000Z",
    source: "demo",
  },
  {
    id: "demo-studio-kera",
    companyId: "demo-company-kera",
    name: "Studio Kera",
    slug: "studio-kera",
    description:
      "Een gespecialiseerde haarstudio in Gent met een focus op keratine, gladmakende verzorging en gezond glanzend haar.",
    imageUrl: demoImages.stylist,
    images: [demoImages.stylist, demoImages.hair, demoImages.detail],
    street: "Brabantdam 27",
    postalCode: "9000",
    city: "Gent",
    cityKey: "ghent",
    countryCode: "BE",
    latitude: 51.051,
    longitude: 3.729,
    timezone: "Europe/Brussels",
    categories: [
      { id: "hair", name: "Hair salon", slug: "hair-salon" },
      { id: "keratin", name: "Keratin", slug: "keratin" },
    ],
    services: [
      service(
        "demo-kera-treatment",
        "Keratinebehandeling",
        "Intensieve gladmakende behandeling met advies voor thuisverzorging.",
        ["keratin"],
        [
          ["Kort haar", 160, 120],
          ["Lang haar", 220, 180],
        ],
      ),
      service(
        "demo-kera-cut",
        "Knippen & finish",
        "Knipbeurt met verzorging en finish.",
        ["haircut"],
        [["Alle lengtes", 58, 60]],
      ),
    ],
    team: [
      {
        id: "demo-sarah",
        name: "Sarah",
        role: "Keratin specialist",
        imageUrl: null,
      },
    ],
    openingHours: standardHours,
    reviews: [],
    rating: 4.9,
    reviewCount: 54,
    likeCount: 18,
    updatedAt: "2026-09-24T09:00:00.000Z",
    source: "demo",
  },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasLiveMarketplace(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

class MarketplaceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MarketplaceApiError";
  }
}

async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new MarketplaceApiError(
      "The public marketplace API is not configured.",
    );
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          next: { revalidate: 900 },
        },
      );

      if (response.ok) return (await response.json()) as T;

      const error = new MarketplaceApiError(
        `Marketplace API returned ${response.status}.`,
        response.status,
      );
      if (response.status === 404 || (response.status < 500 && response.status !== 429)) {
        throw error;
      }
      if (attempt === 1) throw error;
    } catch (error) {
      if (
        error instanceof MarketplaceApiError &&
        (error.status === 404 ||
          (error.status !== undefined &&
            error.status < 500 &&
            error.status !== 429))
      ) {
        throw error;
      }
      if (attempt === 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new MarketplaceApiError("Marketplace API request failed.");
}

function countryCodeFromValue(
  value: string | null | undefined,
): SalonProfile["countryCode"] {
  const normalized = (value ?? "").trim().toLowerCase();
  if (["nl", "nederland", "netherlands"].includes(normalized)) return "NL";
  if (["fr", "france"].includes(normalized)) return "FR";
  if (["de", "deutschland", "germany"].includes(normalized)) return "DE";
  return "BE";
}

function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    const supabaseHost = SUPABASE_URL ? new URL(SUPABASE_URL).host : null;
    if (
      url.protocol === "https:" &&
      (url.host === supabaseHost || url.host === "images.unsplash.com")
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function treatmentKeysForName(name: string): TreatmentKey[] {
  const normalized = slugify(name);
  const matches: TreatmentKey[] = [];

  if (normalized.includes("balayage")) matches.push("balayage");
  if (
    normalized.includes("keratin") ||
    normalized.includes("keratine") ||
    normalized.includes("keratin")
  ) {
    matches.push("keratin");
  }
  if (
    normalized.includes("knip") ||
    normalized.includes("coupe") ||
    normalized.includes("cut") ||
    normalized.includes("haarschnitt")
  ) {
    matches.push("haircut");
  }
  if (
    normalized.includes("nagel") ||
    normalized.includes("ongle") ||
    normalized.includes("nail")
  ) {
    matches.push("nails");
  }

  return matches;
}

function mapSearchItem(item: SearchItem): SalonCard {
  const city = item.city?.trim() || "België";
  return {
    id: item.locationId,
    companyId: item.companyId,
    name: item.name,
    slug: item.slug,
    imageUrl: safeImageUrl(item.images[0] ?? item.imageUrl),
    images: item.images
      .map((image) => safeImageUrl(image))
      .filter((image): image is string => Boolean(image)),
    city,
    cityKey: cityKeyFromName(city),
    countryCode: "BE",
    address: item.address,
    treatmentNames: item.treatments.map((treatment) => treatment.name),
    minimumPrice: null,
    rating: item.rating,
    reviewCount: item.reviewCount,
    likeCount: item.likeCount,
    source: "live",
  };
}

function mapProjectionRow(row: ProjectionRestRow): SalonCard {
  const city = row.city?.trim() || "België";
  const rating =
    row.rating == null || !Number.isFinite(Number(row.rating))
      ? null
      : Number(row.rating);
  return {
    id: row.location_id,
    companyId: row.company_id,
    name: row.name,
    slug: row.slug,
    imageUrl: safeImageUrl(row.image_url),
    images: [],
    city,
    cityKey: cityKeyFromName(city),
    countryCode: "BE",
    address: row.address ?? "",
    treatmentNames: (row.treatments ?? []).map((item) => item.name),
    minimumPrice: null,
    rating,
    reviewCount: row.review_count ?? 0,
    likeCount: row.like_count ?? 0,
    source: "live",
  };
}

function cardFromProfile(salon: SalonProfile): SalonCard {
  const prices = salon.services.flatMap((item) =>
    item.variants.map((variant) => variant.price),
  );
  return {
    id: salon.id,
    companyId: salon.companyId,
    name: salon.name,
    slug: salon.slug,
    imageUrl: salon.imageUrl,
    images: salon.images,
    city: salon.city,
    cityKey: salon.cityKey,
    countryCode: salon.countryCode,
    address: [salon.street, salon.postalCode, salon.city]
      .filter(Boolean)
      .join(", "),
    treatmentNames: salon.services.map((item) => item.name),
    minimumPrice: prices.length > 0 ? Math.min(...prices) : null,
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    likeCount: salon.likeCount,
    source: salon.source,
  };
}

type SalonQuery = {
  locale: Locale;
  city?: CityKey | string;
  treatment?: TreatmentKey;
  q?: string;
  limit?: number;
};

export async function getSalons({
  locale,
  city,
  treatment,
  q,
  limit = 24,
}: SalonQuery): Promise<SalonCard[]> {
  if (!hasLiveMarketplace()) {
    const needle = slugify(q ?? "");
    return demoSalons
      .filter((salon) => {
        const cityMatch =
          !city ||
          salon.cityKey === city ||
          slugify(salon.city) === slugify(String(city));
        const treatmentMatch =
          !treatment ||
          salon.services.some((item) =>
            item.treatmentKeys.includes(treatment),
          );
        const queryMatch =
          !needle ||
          slugify(
            [
              salon.name,
              salon.city,
              ...salon.categories.map((item) => item.name),
              ...salon.services.map((item) => item.name),
            ].join(" "),
          ).includes(needle);
        return cityMatch && treatmentMatch && queryMatch;
      })
      .slice(0, limit)
      .map(cardFromProfile);
  }

  const language = localeConfig[locale].language;
  const query = [
    treatment ? treatmentNames[treatment][language] : "",
    city && city in cityNames
      ? cityNames[city as CityKey][language]
      : city
        ? String(city)
        : "",
    q ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!query) {
    return getPublishedSalonCardsPage(0, Math.min(limit, 1_000));
  }

  try {
    const response = await invokeEdgeFunction<SearchResponse>(
      "marketplace-search",
      { q: query, limit: Math.min(limit, 50) },
    );
    return response.items.map(mapSearchItem);
  } catch {
    return [];
  }
}

export async function getSalonBySlug(
  slug: string,
): Promise<SalonProfile | null> {
  if (!hasLiveMarketplace()) {
    return demoSalons.find((salon) => salon.slug === slug) ?? null;
  }

  try {
    const profile = await invokeEdgeFunction<LocationResponse>(
      "marketplace-location-get",
      { slug },
    );
    const item = profile.location;
    const search = await invokeEdgeFunction<SearchResponse>(
      "marketplace-search",
      { q: item.name, limit: 12 },
    ).catch(() => ({ items: [], nextCursor: null }));
    const searchItem = search.items.find((candidate) => candidate.slug === slug);
    const images = [
      ...new Set(
        [...(item.images ?? []), item.imageUrl].filter(
          (image): image is string => Boolean(image),
        ),
      ),
    ]
      .map((image) => safeImageUrl(image))
      .filter((image): image is string => Boolean(image));
    const city = item.city?.trim() || "";

    return {
      id: item.locationId,
      companyId: item.companyId,
      name: item.name,
      slug: item.slug,
      description: item.description?.trim() ?? "",
      imageUrl: images[0] ?? null,
      images,
      street: item.street,
      postalCode: item.postalCode,
      city,
      cityKey: cityKeyFromName(city),
      countryCode: countryCodeFromValue(item.country),
      latitude: item.lat,
      longitude: item.lng,
      timezone: item.timezone,
      categories: profile.categories,
      services: profile.services.map((serviceItem) => ({
        id: serviceItem.serviceId,
        name: serviceItem.name,
        description: serviceItem.description,
        treatmentKeys: treatmentKeysForName(serviceItem.name),
        variants: serviceItem.variants.map((variant) => ({
          id: variant.serviceVariantId,
          name: variant.name,
          price: Number(variant.price),
          durationMinutes: Number(variant.durationMinutes),
          currency: variant.currency ?? "EUR",
        })),
      })),
      team: profile.team ?? [],
      openingHours: [],
      reviews: [],
      rating: searchItem?.rating ?? null,
      reviewCount: searchItem?.reviewCount ?? 0,
      likeCount: item.likeCount,
      updatedAt: new Date().toISOString(),
      source: "live",
    };
  } catch (error) {
    if (error instanceof MarketplaceApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getAllPublishedSalonCards(): Promise<SalonCard[]> {
  if (!hasLiveMarketplace()) return [];

  const cards: SalonCard[] = [];
  const pageSize = 1_000;
  let page = 0;

  while (page < 100) {
    const rows = await getPublishedSalonCardsPage(page, pageSize);
    cards.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
  }

  return cards;
}

export async function getPublishedSalonCount(): Promise<number> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return 0;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/marketplace_search_location?select=location_id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          prefer: "count=exact",
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return 0;
    const total = response.headers.get("content-range")?.split("/")[1];
    return total && /^\d+$/.test(total) ? Number(total) : 0;
  } catch {
    return 0;
  }
}

export async function getPublishedSalonCardsPage(
  page: number,
  pageSize: number,
): Promise<SalonCard[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const offset = Math.max(0, page) * pageSize;
  const fields = [
    "location_id",
    "company_id",
    "name",
    "slug",
    "image_url",
    "city",
    "address",
    "treatments",
    "rating",
    "review_count",
    "like_count",
  ].join(",");
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/marketplace_search_location?select=${fields}&order=location_id.asc&offset=${offset}&limit=${pageSize}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return [];
    const rows = (await response.json()) as ProjectionRestRow[];
    return rows.map(mapProjectionRow);
  } catch {
    return [];
  }
}

export function getDemoSalonSlugs(): string[] {
  return demoSalons.map((salon) => salon.slug);
}

export function isSalonIndexable(salon: SalonProfile): boolean {
  return (
    salon.source === "live" &&
    salon.name.trim().length > 0 &&
    salon.city.trim().length > 0 &&
    salon.services.some((item) => item.variants.length > 0)
  );
}

export function localesForCountry(
  countryCode: SalonProfile["countryCode"],
): Locale[] {
  switch (countryCode) {
    case "BE":
      return ["nl-be", "fr-be"];
    case "NL":
      return ["nl-nl"];
    case "FR":
      return ["fr-fr"];
    case "DE":
      return ["de-de"];
  }
}

export function profileMatchesLocale(
  salon: SalonProfile,
  locale: Locale,
): boolean {
  return localeConfig[locale].country === salon.countryCode;
}

export function minimumServicePrice(salon: SalonProfile): number | null {
  const prices = salon.services.flatMap((item) =>
    item.variants.map((variant) => variant.price),
  );
  return prices.length > 0 ? Math.min(...prices) : null;
}

// Product mockup data retained from the supplied Gleami landing page.
export const marketplaceImages = demoImages;
export const marketplaceCategories = [
  "All",
  "Hair",
  "Barber",
  "Nails",
  "Lashes & brows",
  "Massage",
];
export const marketplaceSalons = [
  {
    name: "Atelier Noor",
    category: "Hair salon",
    rating: "4.9",
    reviews: 128,
    distance: "0.8 km",
    next: "Today 15:30",
    image: demoImages.hair,
    favourite: true,
  },
  {
    name: "Studio Lune",
    category: "Nail studio",
    rating: "4.8",
    reviews: 86,
    distance: "1.2 km",
    next: "Today 17:00",
    image: demoImages.nails,
  },
  {
    name: "Maison Fade",
    category: "Barber",
    rating: "4.7",
    reviews: 204,
    distance: "1.9 km",
    next: "Tomorrow 09:30",
    image: demoImages.barber,
  },
];
export const mapPins = [
  { x: 34, y: 42, label: "€58", active: true },
  { x: 62, y: 28, label: "€45" },
  { x: 74, y: 60, label: "€32" },
  { x: 20, y: 70, label: "€40" },
  { x: 50, y: 74, label: "€65" },
];
export const salonDetailTreatments = [
  {
    name: "Cut & blow-dry",
    duration: "60 min",
    price: "€58",
    slots: ["15:30", "16:15", "17:00"],
  },
  {
    name: "Balayage",
    duration: "150 min",
    price: "from €145",
    slots: ["Thu 10:00"],
  },
  {
    name: "Gel manicure",
    duration: "60 min",
    price: "€45",
    slots: ["16:00", "17:30"],
  },
];
