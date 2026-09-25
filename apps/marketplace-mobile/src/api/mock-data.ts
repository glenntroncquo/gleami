/**
 * EXAMPLE DATA. Fictional Belgian salons for local development when
 * EXPO_PUBLIC_USE_MOCKS=1. These are not Gleami customers.
 */
import type { LocationCategory, LocationService, MarketplaceCategoryRow } from '@/src/api/types';

export type MockSalon = {
  locationId: string;
  companyId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  images: string[];
  street: string;
  postalCode: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  categoryIds: string[];
  services: LocationService[];
  rating: number | null;
  reviewCount: number;
  likeCount: number;
};

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

export const MOCK_CATEGORIES: MarketplaceCategoryRow[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Herenkapper', slug: 'herenkapper', sort_order: 1 },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Vrouwenkapper', slug: 'vrouwenkapper', sort_order: 2 },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Haar en styling', slug: 'haar-en-styling', sort_order: 3 },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Keratine', slug: 'keratine', sort_order: 4 },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Wenkbrauwen en wimpers', slug: 'wenkbrauwen-en-wimpers', sort_order: 5 },
  { id: '00000000-0000-4000-8000-000000000006', name: 'Massagesalon', slug: 'massagesalon', sort_order: 6 },
  { id: '00000000-0000-4000-8000-000000000007', name: 'Ontharing', slug: 'ontharing', sort_order: 7 },
  { id: '00000000-0000-4000-8000-000000000008', name: 'Nagels', slug: 'nagels', sort_order: 8 },
  { id: '00000000-0000-4000-8000-000000000009', name: 'Gezichtsbehandeling', slug: 'gezichtsbehandeling', sort_order: 9 },
  { id: '00000000-0000-4000-8000-000000000010', name: 'Make-up', slug: 'make-up', sort_order: 10 },
  { id: '00000000-0000-4000-8000-000000000011', name: 'Tatoeages en piercings', slug: 'tatoeages-en-piercings', sort_order: 11 },
];

const category = (slug: string): LocationCategory => {
  const row = MOCK_CATEGORIES.find((item) => item.slug === slug);
  if (!row) throw new Error(`Unknown example category ${slug}`);
  return { id: row.id, name: row.name, slug: row.slug };
};

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function salon(input: Omit<MockSalon, 'country' | 'timezone'>): MockSalon {
  return { ...input, country: 'België', timezone: 'Europe/Brussels' };
}

export const MOCK_SALONS: MockSalon[] = [
  salon({
    locationId: id(101),
    companyId: id(201),
    name: 'Atelier Lumière',
    slug: 'atelier-lumiere',
    description: 'Licht atelier in Elsene voor knippen, balayage en styling. Voorbeeldsalon, geen echte zaak.',
    imageUrl: photo('photo-1560066984-138dadb4c035'),
    images: [
      photo('photo-1560066984-138dadb4c035'),
      photo('photo-1522337360788-8b13dee7a37e'),
      photo('photo-1562322140-8baeececf3df'),
      photo('photo-1516975080664-ed2fc6a32937'),
    ],
    street: 'Elsensesteenweg 142',
    postalCode: '1050',
    city: 'Elsene',
    lat: 50.827,
    lng: 4.372,
    categoryIds: [category('vrouwenkapper').id, category('haar-en-styling').id],
    rating: 4.8,
    reviewCount: 126,
    likeCount: 42,
    services: [
      {
        serviceId: id(301),
        name: 'Knippen dames',
        description: 'Wassen, knippen en een korte finish.',
        variants: [
          { serviceVariantId: id(401), name: 'Kort', price: 48, durationMinutes: 45 },
          { serviceVariantId: id(402), name: 'Lang', price: 62, durationMinutes: 60 },
        ],
      },
      {
        serviceId: id(302),
        name: 'Balayage',
        description: 'Handgeschilderde highlights met een zachte uitgroei.',
        variants: [
          { serviceVariantId: id(403), name: 'Halve hoofd', price: 145, durationMinutes: 120 },
          { serviceVariantId: id(404), name: 'Volledig', price: 195, durationMinutes: 180 },
        ],
      },
    ],
  }),
  salon({
    locationId: id(102),
    companyId: id(202),
    name: 'Barbier De Marollen',
    slug: 'barbier-de-marollen',
    description: 'Klassieke herenkapper tussen de Marollen en de Zavel. Fictief voorbeeld.',
    imageUrl: photo('photo-1503951914875-452162b0f3f1'),
    images: [
      photo('photo-1503951914875-452162b0f3f1'),
      photo('photo-1585747860715-2ba37e788b70'),
      photo('photo-1521590832167-7bcbfaa6381f'),
    ],
    street: 'Hoogstraat 88',
    postalCode: '1000',
    city: 'Brussel',
    lat: 50.841,
    lng: 4.3465,
    categoryIds: [category('herenkapper').id],
    rating: 4.7,
    reviewCount: 88,
    likeCount: 31,
    services: [
      {
        serviceId: id(303),
        name: 'Knippen heren',
        description: 'Schaar of tondeuse, met een warme handdoek.',
        variants: [{ serviceVariantId: id(405), name: 'Standaard', price: 32, durationMinutes: 30 }],
      },
      {
        serviceId: id(304),
        name: 'Baard trimmen',
        description: 'Contour en olie.',
        variants: [{ serviceVariantId: id(406), name: 'Baard', price: 18, durationMinutes: 20 }],
      },
    ],
  }),
  salon({
    locationId: id(103),
    companyId: id(203),
    name: 'Studio Kera',
    slug: 'studio-kera',
    description: 'Keratine en gladstrijken in een kleine studio aan de Flagey. Voorbeelddata.',
    imageUrl: photo('photo-1562322140-8baeececf3df'),
    images: [photo('photo-1562322140-8baeececf3df'), photo('photo-1521590832167-7bcbfaa6381f')],
    street: 'Flageyplein 12',
    postalCode: '1050',
    city: 'Elsene',
    lat: 50.8278,
    lng: 4.3728,
    categoryIds: [category('keratine').id, category('haar-en-styling').id],
    rating: 4.9,
    reviewCount: 54,
    likeCount: 27,
    services: [
      {
        serviceId: id(305),
        name: 'Keratinebehandeling',
        description: 'Gladmakende behandeling, resultaat houdt enkele maanden.',
        variants: [
          { serviceVariantId: id(407), name: 'Kort haar', price: 160, durationMinutes: 120 },
          { serviceVariantId: id(408), name: 'Lang haar', price: 220, durationMinutes: 180 },
        ],
      },
    ],
  }),
  salon({
    locationId: id(104),
    companyId: id(204),
    name: 'Sablon Nagels',
    slug: 'sablon-nagels',
    description: 'Nagelstudio op de Zavel. De voorbeelden hier zijn verzonnen.',
    imageUrl: photo('photo-1604654894610-df63bc536371'),
    images: [photo('photo-1604654894610-df63bc536371'), photo('photo-1519014816548-bf5fe059798b')],
    street: 'Zavel 21',
    postalCode: '1000',
    city: 'Brussel',
    lat: 50.8418,
    lng: 4.3555,
    categoryIds: [category('nagels').id],
    rating: 4.6,
    reviewCount: 73,
    likeCount: 63,
    services: [
      {
        serviceId: id(306),
        name: 'Gellak',
        description: 'Kleur naar keuze, twee weken draagbaar.',
        variants: [{ serviceVariantId: id(409), name: 'Handen', price: 40, durationMinutes: 50 }],
      },
      {
        serviceId: id(307),
        name: 'BIAB',
        description: 'Versteviging met een natuurlijke glans.',
        variants: [{ serviceVariantId: id(410), name: 'Nieuw set', price: 55, durationMinutes: 75 }],
      },
    ],
  }),
  salon({
    locationId: id(105),
    companyId: id(205),
    name: 'Brow Room Dansaert',
    slug: 'brow-room-dansaert',
    description: 'Wenkbrauwen en wimpers aan de Dansaert. Fictieve studio.',
    imageUrl: photo('photo-1522335789203-aabd1fc54bc9'),
    images: [photo('photo-1522335789203-aabd1fc54bc9'), photo('photo-1487412947147-5cebf100ffc2')],
    street: 'Antoine Dansaertstraat 64',
    postalCode: '1000',
    city: 'Brussel',
    lat: 50.8508,
    lng: 4.3468,
    categoryIds: [category('wenkbrauwen-en-wimpers').id],
    rating: 4.8,
    reviewCount: 41,
    likeCount: 29,
    services: [
      {
        serviceId: id(308),
        name: 'Brow lamination',
        description: 'Wenkbrauwen in model, met kleur.',
        variants: [{ serviceVariantId: id(411), name: 'Incl. kleur', price: 55, durationMinutes: 45 }],
      },
      {
        serviceId: id(309),
        name: 'Wimpers liften',
        description: 'Lift zonder extensions.',
        variants: [{ serviceVariantId: id(412), name: 'Lift', price: 65, durationMinutes: 60 }],
      },
    ],
  }),
  salon({
    locationId: id(106),
    companyId: id(206),
    name: 'Maison Massage Sint-Gillis',
    slug: 'maison-massage-sint-gillis',
    description: 'Rustige massageruimte in Sint-Gillis. Alleen voorbeelddata.',
    imageUrl: photo('photo-1544161515-4ab6ce6db874'),
    images: [photo('photo-1544161515-4ab6ce6db874'), photo('photo-1600334129128-685c5582fd35')],
    street: 'Waterloosesteenweg 210',
    postalCode: '1060',
    city: 'Sint-Gillis',
    lat: 50.8265,
    lng: 4.3455,
    categoryIds: [category('massagesalon').id],
    rating: 4.9,
    reviewCount: 39,
    likeCount: 15,
    services: [
      {
        serviceId: id(310),
        name: 'Ontspanningsmassage',
        description: 'Volledige lichaamsmassage met neutrale olie.',
        variants: [
          { serviceVariantId: id(413), name: '50 minuten', price: 70, durationMinutes: 50 },
          { serviceVariantId: id(414), name: '80 minuten', price: 95, durationMinutes: 80 },
        ],
      },
    ],
  }),
  salon({
    locationId: id(107),
    companyId: id(207),
    name: 'Huidatelier Ukkel',
    slug: 'huidatelier-ukkel',
    description: 'Gezichtsbehandelingen in een herenhuis in Ukkel. Verzonnen zaak.',
    imageUrl: photo('photo-1570172619644-dfd03ed5d881'),
    images: [photo('photo-1570172619644-dfd03ed5d881'), photo('photo-1616394584738-fc6e612e71b9')],
    street: 'Brugmannlaan 318',
    postalCode: '1180',
    city: 'Ukkel',
    lat: 50.803,
    lng: 4.366,
    categoryIds: [category('gezichtsbehandeling').id],
    rating: 4.7,
    reviewCount: 62,
    likeCount: 51,
    services: [
      {
        serviceId: id(311),
        name: 'Gezichtsbehandeling',
        description: 'Reinigen, peel en masker afgestemd op je huid.',
        variants: [
          { serviceVariantId: id(415), name: 'Basis', price: 85, durationMinutes: 60 },
          { serviceVariantId: id(416), name: 'Uitgebreid', price: 120, durationMinutes: 90 },
        ],
      },
    ],
  }),
  salon({
    locationId: id(108),
    companyId: id(208),
    name: 'Make-up Loft Louiza',
    slug: 'make-up-loft-louiza',
    description: 'Make-up voor feesten en editorials aan de Louizalaan. Voorbeeld.',
    imageUrl: '',
    images: [],
    street: 'Louizalaan 54',
    postalCode: '1050',
    city: 'Brussel',
    lat: 50.8375,
    lng: 4.3658,
    categoryIds: [category('make-up').id],
    rating: 4.5,
    reviewCount: 22,
    likeCount: 22,
    services: [
      {
        serviceId: id(312),
        name: 'Avondmake-up',
        description: 'Inclusief wimpers en een korte les voor bijwerken.',
        variants: [{ serviceVariantId: id(417), name: 'Avond', price: 75, durationMinutes: 60 }],
      },
      {
        serviceId: id(313),
        name: 'Bruidsmake-up',
        description: 'Proef en de dag zelf. De proef boek je apart.',
        variants: [{ serviceVariantId: id(418), name: 'Proef', price: 90, durationMinutes: 75 }],
      },
    ],
  }),
  salon({
    locationId: id(109),
    companyId: id(209),
    name: 'Inkt & Staal',
    slug: 'inkt-en-staal',
    description: 'Tatoeage- en piercingstudio in Antwerpen-Zuid. Fictief.',
    imageUrl: photo('photo-1568515045052-f9a854d70bfd'),
    images: [photo('photo-1568515045052-f9a854d70bfd'), photo('photo-1611501275019-9b95c90f3b1a')],
    street: 'Nationalestraat 78',
    postalCode: '2000',
    city: 'Antwerpen',
    lat: 51.2135,
    lng: 4.3985,
    categoryIds: [category('tatoeages-en-piercings').id],
    rating: 4.8,
    reviewCount: 97,
    likeCount: 11,
    services: [
      {
        serviceId: id(314),
        name: 'Piercing',
        description: 'Oor of neus, sieraden inbegrepen.',
        variants: [{ serviceVariantId: id(419), name: 'Lobe of neus', price: 35, durationMinutes: 20 }],
      },
      {
        serviceId: id(315),
        name: 'Kleine tatoeage',
        description: 'Tot ongeveer een bankkaart. Consult eerst.',
        variants: [{ serviceVariantId: id(420), name: 'Flash', price: 80, durationMinutes: 45 }],
      },
    ],
  }),
  salon({
    locationId: id(110),
    companyId: id(210),
    name: 'Salon Noord',
    slug: 'salon-noord',
    description: 'Buurtsalon in Antwerpen-Noord voor knippen en kleur. Voorbeelddata.',
    imageUrl: photo('photo-1521590832167-7bcbfaa6381f'),
    images: [photo('photo-1521590832167-7bcbfaa6381f'), photo('photo-1633681926022-84c23e8cb2d6')],
    street: 'Van Kerckhovenstraat 15',
    postalCode: '2060',
    city: 'Antwerpen',
    lat: 51.2305,
    lng: 4.4165,
    categoryIds: [category('vrouwenkapper').id, category('herenkapper').id],
    rating: 4.4,
    reviewCount: 33,
    likeCount: 37,
    services: [
      {
        serviceId: id(316),
        name: 'Knippen',
        description: 'Dames of heren, wassen inbegrepen.',
        variants: [
          { serviceVariantId: id(421), name: 'Heren', price: 28, durationMinutes: 30 },
          { serviceVariantId: id(422), name: 'Dames', price: 45, durationMinutes: 45 },
        ],
      },
      {
        serviceId: id(317),
        name: 'Kleuren',
        description: 'Uitgroei of volledige kleur.',
        variants: [{ serviceVariantId: id(423), name: 'Uitgroei', price: 68, durationMinutes: 75 }],
      },
    ],
  }),
  salon({
    locationId: id(111),
    companyId: id(211),
    name: 'Gentse Golven',
    slug: 'gentse-golven',
    description: 'Kapsalon aan de Veldstraat met nadruk op golven en styling. Fictief.',
    imageUrl: photo('photo-1560066984-138dadb4c035'),
    images: [
      photo('photo-1560066984-138dadb4c035'),
      photo('photo-1519415387722-a1c3bbef716c'),
      photo('photo-1522337360788-8b13dee7a37e'),
    ],
    street: 'Veldstraat 41',
    postalCode: '9000',
    city: 'Gent',
    lat: 51.0518,
    lng: 3.7215,
    categoryIds: [category('haar-en-styling').id, category('vrouwenkapper').id],
    rating: 4.6,
    reviewCount: 58,
    likeCount: 44,
    services: [
      {
        serviceId: id(318),
        name: 'Brushing',
        description: 'Föhnstyling op droog of nat haar.',
        variants: [{ serviceVariantId: id(424), name: 'Styling', price: 35, durationMinutes: 30 }],
      },
      {
        serviceId: id(319),
        name: 'Golven knippen',
        description: 'Vormknip die de natuurlijke slag volgt.',
        variants: [{ serviceVariantId: id(425), name: 'Knippen', price: 58, durationMinutes: 60 }],
      },
    ],
  }),
  salon({
    locationId: id(112),
    companyId: id(212),
    name: 'Wax Studio Gent-Zuid',
    slug: 'wax-studio-gent-zuid',
    description: 'Ontharing in Gent-Zuid. De prijzen en namen zijn voorbeeld.',
    imageUrl: photo('photo-1519415387722-a1c3bbef716c'),
    images: [photo('photo-1519415387722-a1c3bbef716c')],
    street: 'Woodrow Wilsonplein 4',
    postalCode: '9000',
    city: 'Gent',
    lat: 51.0365,
    lng: 3.7305,
    categoryIds: [category('ontharing').id],
    rating: null,
    reviewCount: 0,
    likeCount: 19,
    services: [
      {
        serviceId: id(320),
        name: 'Ontharen benen',
        description: 'Warm wax, halve of volle benen.',
        variants: [
          { serviceVariantId: id(426), name: 'Halve benen', price: 28, durationMinutes: 25 },
          { serviceVariantId: id(427), name: 'Volle benen', price: 42, durationMinutes: 40 },
        ],
      },
      {
        serviceId: id(321),
        name: 'Ontharen oksels',
        description: 'Korte afspraak, zonder kleur.',
        variants: [{ serviceVariantId: id(428), name: 'Oksels', price: 12, durationMinutes: 15 }],
      },
    ],
  }),
];

export function categoryById(categoryId: string): LocationCategory | undefined {
  const row = MOCK_CATEGORIES.find((item) => item.id === categoryId);
  if (!row) return undefined;
  return { id: row.id, name: row.name, slug: row.slug };
}
