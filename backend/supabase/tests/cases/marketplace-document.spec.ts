import { describe, expect, it } from "vitest";
import {
  buildMarketplaceSearchDocument,
  pickDefaultVariant,
  type LocationSource,
  type ServiceSource,
} from "../../supabase/functions/_shared/marketplace/document.ts";

const categoryKeratin = "01900000-0000-4000-8000-000000000004";
const categoryNails = "01900000-0000-4000-8000-000000000008";

function service(overrides: Partial<ServiceSource> = {}): ServiceSource {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Keratine behandeling",
    isActive: true,
    isDeleted: false,
    isMarketplaceVisible: true,
    categoryIds: [categoryKeratin],
    variants: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        displayOrder: 2,
        isActive: true,
        isDeleted: false,
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        displayOrder: 1,
        isActive: true,
        isDeleted: false,
      },
    ],
    ...overrides,
  };
}

function source(overrides: Partial<LocationSource> = {}): LocationSource {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    companyId: "22222222-2222-4222-8222-222222222222",
    name: "Salon Noord",
    slug: " salon-noord ",
    imageUrl: "https://cdn.example/salon.jpg",
    street: "Kerkstraat 1",
    postalCode: "2000",
    city: "Antwerpen",
    country: "BE",
    timezone: "Europe/Brussels",
    isListed: true,
    isActive: true,
    hasCoordinates: true,
    likeCount: 4,
    services: [service()],
    categories: [
      { id: categoryKeratin, name: "Keratine" },
      { id: categoryNails, name: "Nagels" },
    ],
    ...overrides,
  };
}

describe("buildMarketplaceSearchDocument", () => {
  it("returns null unless the location is listed, active, slugged, and geocoded", () => {
    expect(buildMarketplaceSearchDocument(source({ isListed: false }))).toBeNull();
    expect(buildMarketplaceSearchDocument(source({ isActive: false }))).toBeNull();
    expect(buildMarketplaceSearchDocument(source({ slug: "  " }))).toBeNull();
    expect(buildMarketplaceSearchDocument(source({ slug: null }))).toBeNull();
    expect(buildMarketplaceSearchDocument(source({ hasCoordinates: false }))).toBeNull();
  });

  it("picks the first active variant and builds search text and category ids", () => {
    const document = buildMarketplaceSearchDocument(source());
    expect(document).toMatchObject({
      locationId: "11111111-1111-4111-8111-111111111111",
      companyId: "22222222-2222-4222-8222-222222222222",
      slug: "salon-noord",
      address: "Kerkstraat 1, 2000",
      likeCount: 4,
      categoryIds: [categoryKeratin],
      treatments: [
        {
          serviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          serviceVariantId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          name: "Keratine behandeling",
        },
      ],
    });
    expect(document?.searchText).toBe("salon noord antwerpen keratine keratine behandeling");
  });

  it("drops hidden services, services with no live variant, and inactive categories", () => {
    const document = buildMarketplaceSearchDocument(source({
      services: [
        service({ isMarketplaceVisible: false, name: "Hidden" }),
        service({
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          name: "Gone",
          isDeleted: true,
        }),
        service({
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          name: "No variant",
          variants: [{ id: "ffffffff-ffff-4fff-8fff-ffffffffffff", displayOrder: 0, isActive: false, isDeleted: false }],
          categoryIds: [categoryNails],
        }),
        service({
          id: "99999999-9999-4999-8999-999999999999",
          name: "Nagels",
          categoryIds: ["00000000-0000-4000-8000-000000000099", categoryNails],
          variants: [{ id: "88888888-8888-4888-8888-888888888888", displayOrder: null, isActive: null, isDeleted: null }],
        }),
      ],
    }));

    expect(document?.treatments.map((treatment) => treatment.name)).toEqual(["Nagels"]);
    expect(document?.categoryIds).toEqual([categoryNails]);
    expect(document?.searchText).toContain("nagels");
    expect(document?.searchText).not.toContain("hidden");
  });

  it("orders default variants by display_order then id", () => {
    const picked = pickDefaultVariant([
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", displayOrder: 1, isActive: true, isDeleted: false },
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", displayOrder: 1, isActive: true, isDeleted: false },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", displayOrder: 0, isActive: false, isDeleted: false },
    ]);
    expect(picked?.id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
