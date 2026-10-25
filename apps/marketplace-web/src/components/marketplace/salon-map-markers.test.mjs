import assert from "node:assert/strict";
import test from "node:test";
import { categoryIconKey, categoryIconPaths, primarySalonCategory } from "./category-icons.ts";
import { CATEGORY_ICON_ZOOM, markerPresentation } from "./salon-map-markers.ts";

const marketplaceSlugs = [
  "herenkapper", "vrouwenkapper", "haar-en-styling", "keratine",
  "wenkbrauwen-en-wimpers", "massagesalon", "ontharing", "nagels",
  "gezichtsbehandeling", "make-up", "tatoeages-en-piercings",
];

test("every marketplace category has its own distinct icon", () => {
  const shapes = marketplaceSlugs.map((slug) => {
    assert.equal(categoryIconKey(slug), slug);
    assert.ok(categoryIconPaths[slug].every((path) => path.length > 0));
    return JSON.stringify(categoryIconPaths[slug]);
  });
  assert.equal(new Set(shapes).size, marketplaceSlugs.length);
});

test("category selection uses stable slugs regardless of the displayed language", () => {
  for (const name of ["Vrouwenkapper", "Coiffeur femme", "Women's hairdresser", "Damenfriseur"]) {
    const category = primarySalonCategory([{ id: "women", name, slug: "vrouwenkapper" }]);
    assert.equal(categoryIconKey(category.slug), "vrouwenkapper");
  }
});

test("a selected filter determines the marker for a multi-category salon", () => {
  const categories = [
    { id: "hair", name: "Haar en styling", slug: "haar-en-styling" },
    { id: "keratin", name: "Keratine", slug: "keratine" },
  ];
  assert.equal(primarySalonCategory(categories).slug, "haar-en-styling");
  assert.equal(primarySalonCategory(categories, "keratin").slug, "keratine");
  assert.equal(primarySalonCategory(categories, "missing").slug, "haar-en-styling");
});

test("missing and new categories have a safe fallback", () => {
  assert.equal(primarySalonCategory([]), null);
  for (const slug of [null, undefined, "", "future-category", "__proto__", "constructor"]) {
    assert.equal(categoryIconKey(slug), "salon");
  }
  const categories = [
    { id: "new", name: "New", slug: "future-category" },
    { id: "nails", name: "Nails", slug: "nagels" },
  ];
  assert.equal(primarySalonCategory(categories).id, "nails");
});

test("local demo categories retain meaningful icons", () => {
  assert.equal(categoryIconKey("hair-salon"), "haar-en-styling");
  assert.equal(categoryIconKey("barber"), "herenkapper");
  assert.equal(categoryIconKey("nail-studio"), "nagels");
  assert.equal(categoryIconKey("keratin"), "keratine");
});

test("zoomed-out markers are dots at their exact coordinates, even for co-located salons", () => {
  for (const zoom of [3, 6, 9, CATEGORY_ICON_ZOOM - 0.01]) {
    for (const stack of [0, 1, 5, 47]) {
      assert.deepEqual(markerPresentation(zoom, stack), { compact: true, offset: [0, 0] });
    }
  }
});

test("neighbourhood zoom restores category icons and separates co-located salons", () => {
  for (const zoom of [CATEGORY_ICON_ZOOM, 14, 18]) {
    assert.equal(markerPresentation(zoom, 0).compact, false);
    assert.equal(Math.abs(markerPresentation(zoom, 0).offset[1]), 0);
    assert.deepEqual(markerPresentation(zoom, 1), { compact: false, offset: [0, -42] });
    assert.deepEqual(markerPresentation(zoom, 2), { compact: false, offset: [0, -84] });
  }
});
