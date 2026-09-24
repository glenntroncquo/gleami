import { describe, expect, it } from "vitest";
import { searchCardImages } from "../../supabase/functions/_shared/marketplace/media-url.ts";
import { suggestItemFromRow } from "../../supabase/functions/_shared/marketplace/suggest.ts";

const base = "https://example.supabase.co";

describe("search card images", () => {
  it("uses up to five gallery paths and ignores a longer list", () => {
    const images = searchCardImages(
      ["co/a.jpg", "co/b.jpg", "co/c.jpg", "co/d.jpg", "co/e.jpg", "co/f.jpg"],
      "https://cdn.example/card.jpg",
      base,
    );
    expect(images).toEqual([
      `${base}/storage/v1/object/public/marketplace/co/a.jpg`,
      `${base}/storage/v1/object/public/marketplace/co/b.jpg`,
      `${base}/storage/v1/object/public/marketplace/co/c.jpg`,
      `${base}/storage/v1/object/public/marketplace/co/d.jpg`,
      `${base}/storage/v1/object/public/marketplace/co/e.jpg`,
    ]);
  });

  it("falls back to imageUrl when there is no media", () => {
    expect(searchCardImages([], "https://cdn.example/card.jpg", base)).toEqual([
      "https://cdn.example/card.jpg",
    ]);
    expect(searchCardImages(null, null, base)).toEqual([]);
  });
});

describe("suggest location slug", () => {
  it("requires slug on location items", () => {
    expect(suggestItemFromRow({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Salon Noord",
      type: "location",
      slug: "salon-noord",
      location_id: "11111111-1111-4111-8111-111111111111",
    })).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Salon Noord",
      type: "location",
      slug: "salon-noord",
      locationId: "11111111-1111-4111-8111-111111111111",
    });

    expect(suggestItemFromRow({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Salon Noord",
      type: "location",
      slug: null,
      location_id: "11111111-1111-4111-8111-111111111111",
    })).toBeNull();
  });

  it("leaves slug off service items", () => {
    expect(suggestItemFromRow({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Knippen",
      type: "service",
      slug: null,
      location_id: null,
    })).toEqual({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Knippen",
      type: "service",
    });
  });
});
