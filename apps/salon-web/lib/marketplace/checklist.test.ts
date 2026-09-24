import { buildPublishChecklist, canListLocation } from "./checklist";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

const empty = {
  slug: null,
  street: null,
  postalCode: null,
  city: null,
  hasCoordinates: false,
  visibleCategorisedServiceCount: 0,
  photoCount: 0,
};

function run() {
  const missing = buildPublishChecklist(empty);
  assertEqual(
    missing.map((item) => item.id),
    ["slug", "address", "coordinates", "service", "photo"],
    "checklist order",
  );
  assertEqual(
    missing.map((item) => item.blocking),
    [true, false, false, false, false],
    "only the slug blocks publishing",
  );
  assertEqual(
    missing.every((item) => item.done === false),
    true,
    "empty location has nothing done",
  );
  assertEqual(canListLocation(missing), false, "cannot list without a slug");

  const slugOnly = buildPublishChecklist({
    ...empty,
    slug: "  Studio Gent  ",
  });
  assertEqual(slugOnly[0]?.done, true, "name-like slug counts once normalized");
  assertEqual(canListLocation(slugOnly), true, "slug alone is enough to list");
  assertEqual(
    slugOnly.slice(1).every((item) => item.done === false),
    true,
    "other items stay open",
  );

  assertEqual(
    buildPublishChecklist({ ...empty, slug: "---" })[0]?.done,
    false,
    "punctuation is not a slug",
  );
  assertEqual(
    buildPublishChecklist({ ...empty, slug: "   " })[0]?.done,
    false,
    "whitespace is not a slug",
  );

  const partialAddress = buildPublishChecklist({
    ...empty,
    slug: "studio",
    street: "Korenmarkt 1",
    city: "Gent",
  });
  assertEqual(partialAddress[1]?.done, false, "address needs street, postal code and city");

  const ready = buildPublishChecklist({
    slug: "studio-gent",
    street: "Korenmarkt 1",
    postalCode: "9000",
    city: " Gent ",
    hasCoordinates: true,
    visibleCategorisedServiceCount: 2,
    photoCount: 3,
  });
  assertEqual(
    ready.every((item) => item.done),
    true,
    "complete profile checks every item",
  );
  assertEqual(canListLocation(ready), true, "complete profile can list");

  assertEqual(
    buildPublishChecklist({ ...empty, slug: "studio", visibleCategorisedServiceCount: 0 })[3]?.done,
    false,
    "a service without a category does not count",
  );
  assertEqual(
    buildPublishChecklist({ ...empty, slug: "studio", visibleCategorisedServiceCount: 1 })[3]?.done,
    true,
    "one visible categorised service is enough",
  );
  assertEqual(
    buildPublishChecklist({ ...empty, slug: "studio", photoCount: 1 })[4]?.done,
    true,
    "one photo is enough",
  );
  assertEqual(
    buildPublishChecklist({ ...empty, slug: "studio", hasCoordinates: false })[2]?.done,
    false,
    "missing coordinates stay a warning",
  );
}

run();
console.log("checklist.test.ts passed");
