import assert from "node:assert/strict";
import test from "node:test";
import { locales, localeConfig, routeFor, treatmentNames, localeFromPathname } from "../../lib/i18n.ts";
import { categoryIconPaths } from "../marketplace/category-icons.ts";
import { recoveryMessages, recoveryTreatments, surpriseTreatment } from "./recovery-copy.ts";

test("every supported locale has complete empty-state and 404 copy", () => {
  for (const locale of locales) {
    const copy = recoveryMessages[localeConfig[locale].language];
    assert.ok(copy);
    for (const variant of ["empty", "notFound"]) {
      for (const field of ["eyebrow", "title", "accent", "body"]) {
        assert.ok(copy[variant][field].trim().length > 0, `${locale}: ${variant}.${field}`);
      }
    }
    assert.match(copy.notFound.eyebrow, /404/);
    for (const field of ["discover", "reset", "home", "map", "suggestions", "surprise", "surpriseHint", "caption"]) {
      assert.ok(copy[field].trim().length > 0, `${locale}: ${field}`);
    }
  }
  assert.equal(recoveryMessages.en.notFound.title, "This page is taking");
});

test("suggestions use real, distinct treatments and existing category icons", () => {
  assert.equal(new Set(recoveryTreatments.map((item) => item.treatment)).size, 4);
  for (const { treatment, icon } of recoveryTreatments) {
    assert.ok(Object.hasOwn(treatmentNames, treatment));
    assert.ok(Object.hasOwn(categoryIconPaths, icon));
    for (const locale of locales) {
      assert.ok(treatmentNames[treatment][localeConfig[locale].language]);
      const href = routeFor(locale, { kind: "treatment", treatment });
      assert.ok(href.startsWith(`/${locale}/${localeConfig[locale].paths.treatments}/`));
      assert.ok(!href.includes("undefined"));
    }
  }
});

test("surprise action only selects published treatment routes", () => {
  const options = recoveryTreatments.map((item) => item.treatment);
  for (const value of [0, 0.1, 0.25, 0.49, 0.5, 0.75, 0.999, 1, -1, NaN, Infinity]) {
    assert.ok(options.includes(surpriseTreatment(value)));
  }
  assert.deepEqual([0, 0.25, 0.5, 0.75].map(surpriseTreatment), options);
});

test("404 recovery preserves known locales and uses the canonical Dutch home", () => {
  for (const locale of locales) {
    assert.equal(localeFromPathname(`/${locale}/missing/page`), locale);
  }
  assert.equal(localeFromPathname("/some/missing/page"), "nl-be");
  assert.equal(routeFor("nl-be", { kind: "home" }), "/");
  assert.equal(routeFor("en", { kind: "home" }), "/en");
  assert.equal(routeFor("fr-be", { kind: "salons" }), "/fr-be/salons");
});
