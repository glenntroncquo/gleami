import { readFileSync } from "node:fs";
import { isUniqueViolation, normalizeSlug, slugFromName, suggestAlternativeSlug } from "./slug";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

function run() {
  assertEqual(slugFromName("Studio Gent"), "studio-gent", "kebab-case from a location name");
  assertEqual(slugFromName("  Café Élise!! "), "cafe-elise", "ascii fold and trim");
  assertEqual(slugFromName("Haar & Styling"), "haar-styling", "ampersand becomes a hyphen");
  assertEqual(slugFromName("Knippen/Kleuren"), "knippen-kleuren", "slash becomes a hyphen");
  assertEqual(slugFromName("België"), "belgie", "dutch diaeresis");
  assertEqual(slugFromName("---"), "", "punctuation only");
  assertEqual(slugFromName("a--b"), "a-b", "collapse hyphens");
  assertEqual(slugFromName("2e Kapsalon"), "2e-kapsalon", "leading number");
  assertEqual(normalizeSlug("Studio-Gent"), "studio-gent", "normalize is lowercase");
  assertEqual(normalizeSlug("  studio-gent  "), "studio-gent", "normalize trims");

  assertEqual(suggestAlternativeSlug("studio-gent"), "studio-gent-2", "first alternative");
  assertEqual(suggestAlternativeSlug("studio-gent-2"), "studio-gent-3", "increment suffix");
  assertEqual(suggestAlternativeSlug("studio-gent-9"), "studio-gent-10", "two-digit suffix");
  assertEqual(suggestAlternativeSlug("Studio Gent"), "studio-gent-2", "suggestion normalizes first");
  assertEqual(suggestAlternativeSlug(""), "locatie-2", "empty slug still suggests something");

  assertEqual(isUniqueViolation({ code: "23505", message: "duplicate key" }), true, "postgres unique violation");
  assertEqual(isUniqueViolation({ message: "duplicate key value violates unique constraint" }), true, "message fallback");
  assertEqual(isUniqueViolation({ code: "23514", message: "check constraint" }), false, "check constraint is not a slug clash");
  assertEqual(isUniqueViolation(null), false, "no error");

  const nl = JSON.parse(
    readFileSync(new URL("../../messages/nl.json", import.meta.url), "utf8"),
  ) as { settings: { marketplace: { publish: { slugTaken: string } } } };
  assertEqual(
    nl.settings.marketplace.publish.slugTaken,
    "Deze link is al in gebruik",
    "dutch unique-slug error",
  );
}

run();
console.log("slug.test.ts passed");
