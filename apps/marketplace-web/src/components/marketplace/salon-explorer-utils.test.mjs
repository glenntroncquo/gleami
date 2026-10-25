import assert from "node:assert/strict";
import test from "node:test";
import { distanceKm, filterSalons, normalized, previewServices, readExplorerSearch, serviceSummary } from "./salon-explorer-utils.ts";

function salon(id, overrides = {}) {
  return {
    id, companyId: id, name: id, slug: id, imageUrl: null, images: [],
    city: "Gent", cityKey: "ghent", countryCode: "BE", address: "Gent",
    rating: null, reviewCount: 0, likeCount: 0, source: "demo",
    treatmentNames: [], minimumPrice: null, latitude: 51.05, longitude: 3.72,
    categories: [], services: [], ...overrides,
  };
}

function service(id, name, prices, durations = [30]) {
  return {
    id, name, description: null, treatmentKeys: [],
    variants: prices.map((price, index) => ({
      id: `${id}-${index}`, name, price, durationMinutes: durations[index % durations.length], currency: "EUR",
    })),
  };
}

const defaults = { query: "", category: null, sort: "recommended", place: null, area: null };

test("search ignores accents and matches all words across name, services and city", () => {
  const salons = [
    salon("Éclat", { services: [service("cut", "Coupe", [30])] }),
    salon("Other", { city: "Brussel", address: "Brussel", services: [service("cut", "Coupe", [30])] }),
  ];
  assert.equal(normalized("  ÉCLAT "), "eclat");
  assert.deepEqual(filterSalons(salons, { ...defaults, query: "eclat coupe gent" }).map((item) => item.id), ["Éclat"]);
  assert.equal(filterSalons(salons, { ...defaults, query: "coupe missing" }).length, 0);
});

test("category and map bounds compose without admitting salons with no location", () => {
  const salons = [
    salon("near", { categories: [{ id: "hair", name: "Hair" }] }),
    salon("far", { latitude: 50.8, longitude: 4.35, categories: [{ id: "hair", name: "Hair" }] }),
    salon("no-point", { latitude: null, categories: [{ id: "hair", name: "Hair" }] }),
    salon("nails", { categories: [{ id: "nails", name: "Nails" }] }),
  ];
  assert.deepEqual(filterSalons(salons, {
    ...defaults, category: "hair", area: { west: 3.7, east: 3.8, south: 51, north: 51.1 },
  }).map((item) => item.id), ["near"]);
  assert.equal(filterSalons(salons, defaults).length, 4);
});

test("price sorting preserves free treatments and places unknown prices last", () => {
  const salons = [salon("unknown"), salon("paid", { minimumPrice: 25 }), salon("free", { minimumPrice: 0 })];
  assert.deepEqual(filterSalons(salons, { ...defaults, sort: "price" }).map((item) => item.id), ["free", "paid", "unknown"]);
  assert.deepEqual(salons.map((item) => item.id), ["unknown", "paid", "free"]);
});

test("rating sorting uses reviewed ratings, with review count breaking ties", () => {
  const salons = [
    salon("unreviewed", { rating: 5 }),
    salon("rated", { rating: 4.8, reviewCount: 10 }),
    salon("more-reviews", { rating: 4.8, reviewCount: 50 }),
  ];
  assert.deepEqual(filterSalons(salons, { ...defaults, sort: "rating" }).map((item) => item.id), ["more-reviews", "rated", "unreviewed"]);
});

test("nearby sorting uses coordinates and keeps unknown locations last", () => {
  const salons = [salon("unknown", { latitude: null }), salon("far", { latitude: 50.8, longitude: 4.35 }), salon("near")];
  assert.deepEqual(filterSalons(salons, { ...defaults, place: { lat: 51.05, lng: 3.72 } }).map((item) => item.id), ["near", "far", "unknown"]);
  assert.equal(distanceKm({ lat: 51.05, lng: 3.72 }, 51.05, 3.72), 0);
  assert.ok(Number.isFinite(distanceKm({ lat: 90, lng: 0 }, -90, 180)));
});

test("service previews put matching services first without mutating the catalog", () => {
  const services = [
    service("cut", "Knippen", [30]), service("colour", "Kleuren", [50]),
    service("finish", "Brushing", [25]), service("keratin", "Kératine", [180, 220]),
  ];
  assert.deepEqual(previewServices(services, "keratine").map((item) => item.id), ["keratin", "cut", "colour"]);
  assert.equal(services[0].id, "cut");
});

test("explorer search keeps a place only when both coordinates are usable", () => {
  assert.deepEqual(readExplorerSearch({
    q: " knippen ", where: "Merelbeke", lat: "50.994", lng: "3.746", date: "2026-10-24", part: "morning",
  }), {
    query: "knippen", where: "Merelbeke", lat: 50.994, lng: 3.746, date: "2026-10-24", part: "morning",
  });
  assert.deepEqual(readExplorerSearch({ where: "Merelbeke", lat: "nope", lng: "3.7", part: "noon", date: "tomorrow" }), {
    query: "", where: null, lat: null, lng: null, date: null, part: "any",
  });
});

test("service summaries show actual ranges, not invented prices or durations", () => {
  assert.deepEqual(serviceSummary(service("cut", "Cut", [30, 50], [30, 60])), { price: 30, variablePrice: true, duration: "30–60" });
  assert.deepEqual(serviceSummary(service("free", "Free", [0, 0], [30])), { price: 0, variablePrice: false, duration: "30" });
  assert.deepEqual(serviceSummary(service("empty", "Empty", [])), { price: null, variablePrice: false, duration: null });
  assert.deepEqual(serviceSummary(service("invalid", "Invalid", [NaN, -1], [0, NaN])), { price: null, variablePrice: false, duration: null });
});
