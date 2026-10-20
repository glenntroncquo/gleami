import {
  clientListRange,
  clientPageCount,
  clientSearchFilters,
  isClientSortColumn,
} from "./client-page";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

function run() {
  assertEqual(clientListRange(0, 50), { from: 0, to: 49 }, "first page range");
  assertEqual(clientListRange(2, 25), { from: 50, to: 74 }, "later page range");
  assertEqual(clientListRange(-1, 0), { from: 0, to: 0 }, "invalid page clamps");

  assertEqual(clientPageCount(0, 50), 0, "empty list has no pages");
  assertEqual(clientPageCount(50, 50), 1, "exact page fills one page");
  assertEqual(clientPageCount(51, 50), 2, "remainder opens another page");

  assertEqual(clientSearchFilters("  "), [], "blank search is unfiltered");
  assertEqual(
    clientSearchFilters("Ann"),
    ['first_name.ilike."%Ann%",last_name.ilike."%Ann%",email.ilike."%Ann%"'],
    "single word searches name and email",
  );
  assertEqual(
    clientSearchFilters("Ann Marie"),
    [
      'first_name.ilike."%Ann%",last_name.ilike."%Ann%",email.ilike."%Ann%"',
      'first_name.ilike."%Marie%",last_name.ilike."%Marie%",email.ilike."%Marie%"',
    ],
    "each word is its own filter",
  );
  assertEqual(clientSearchFilters("100%"), ['first_name.ilike."%100%",last_name.ilike."%100%",email.ilike."%100%"'], "wildcards are stripped");
  assertEqual(isClientSortColumn("email"), true, "email is sortable");
  assertEqual(isClientSortColumn("id"), false, "unknown columns are rejected");
}

run();
console.log("client-page.test.ts passed");
