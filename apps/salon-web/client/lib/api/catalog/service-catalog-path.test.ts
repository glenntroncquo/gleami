import {
  LEGACY_TREATMENT_CATALOG_PATH,
  SERVICE_CATALOG_PATH,
  localizedLegacyTreatmentPath,
  localizedServiceCatalogPath,
} from "./service-catalog-path";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function run() {
  assertEqual(SERVICE_CATALOG_PATH, "/service", "canonical catalog path");
  assertEqual(
    LEGACY_TREATMENT_CATALOG_PATH,
    "/treatment",
    "leftover treatment path is the redirect source",
  );
  const catalogPath: string = SERVICE_CATALOG_PATH;
  const leftoverPath: string = LEGACY_TREATMENT_CATALOG_PATH;
  assertEqual(
    catalogPath === leftoverPath,
    false,
    "new path is not the leftover treatment route",
  );
  assertEqual(
    localizedServiceCatalogPath("nl"),
    "/nl/service",
    "localized catalog path keeps locale prefix",
  );
  assertEqual(
    localizedLegacyTreatmentPath("nl"),
    "/nl/treatment",
    "legacy path keeps locale prefix",
  );
}

run();
console.log("service-catalog-path.test.ts passed");
