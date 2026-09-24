import { isMissingSchemaError } from "./errors";
import {
  companyIdForLocation,
  mergeAccessibleLocationIds,
  pickSelectedLocationId,
  primaryOrSoleLocationId,
  shouldShowLocationSwitcher,
  shouldWaitForLocationPick,
} from "./resolve";
import {
  locationStorageKey,
  resolvePersistedLocationId,
  settleLocationSelection,
} from "./storage";
import { withLocationId } from "./resolve";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

function assertTrue(value: unknown, message: string) {
  if (value !== true) {
    throw new Error(`${message}\n  expected: true\n  actual:   ${JSON.stringify(value)}`);
  }
}

function assertFalse(value: unknown, message: string) {
  if (value !== false) {
    throw new Error(`${message}\n  expected: false\n  actual:   ${JSON.stringify(value)}`);
  }
}

const LOCATION_A = "11111111-1111-1111-1111-111111111111";
const LOCATION_B = "22222222-2222-2222-2222-222222222222";
const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function run() {
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [LOCATION_B, LOCATION_A],
      persistedId: LOCATION_B,
      fallbackId: LOCATION_A,
    }),
    LOCATION_B,
    "persisted location wins when still accessible",
  );
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [LOCATION_A],
      persistedId: LOCATION_B,
      fallbackId: LOCATION_A,
    }),
    LOCATION_A,
    "stale persisted location is ignored",
  );
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [LOCATION_B, LOCATION_A],
      persistedId: null,
      primaryId: LOCATION_B,
    }),
    LOCATION_B,
    "primary location is the fallback when nothing is persisted",
  );
  assertEqual(
    pickSelectedLocationId({ accessibleIds: [] }),
    null,
    "no accessible locations",
  );
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [LOCATION_A],
      persistedId: null,
      fallbackId: null,
      primaryId: null,
    }),
    LOCATION_A,
    "empty storage still picks the sole accessible location (1:1 / Safari clear)",
  );
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [],
      persistedId: LOCATION_A,
    }),
    LOCATION_A,
    "stored id is kept while the accessible list is still empty",
  );
  assertEqual(
    mergeAccessibleLocationIds([], [{ id: LOCATION_A }]),
    [LOCATION_A],
    "company location rows are accessible even without location_membership",
  );
  assertEqual(
    primaryOrSoleLocationId([{ id: LOCATION_A, is_primary: false }]),
    LOCATION_A,
    "sole company location is the 1:1 pick",
  );
  assertTrue(
    shouldWaitForLocationPick(null, false),
    "pages may wait while locations hydrate",
  );
  assertFalse(
    shouldWaitForLocationPick(null, true),
    "after hydrate, null locationId must not keep spinning",
  );
  assertFalse(
    shouldWaitForLocationPick(LOCATION_A, false),
    "auto-picked id unblocks pages immediately",
  );

  assertFalse(
    shouldShowLocationSwitcher({ accessibleCount: 1 }),
    "one accessible location hides the switcher",
  );
  assertFalse(
    shouldShowLocationSwitcher({ accessibleCount: 0 }),
    "no accessible locations hides the switcher",
  );
  assertTrue(
    shouldShowLocationSwitcher({ accessibleCount: 2 }),
    "two accessible locations show the switcher",
  );

  assertEqual(
    companyIdForLocation(
      [
        { id: LOCATION_A, company_id: COMPANY_A },
        { id: LOCATION_B, company_id: COMPANY_B },
      ],
      LOCATION_B,
      COMPANY_A,
    ),
    COMPANY_B,
    "switching location also switches the company for freelancers",
  );
  assertEqual(
    companyIdForLocation([], null, COMPANY_A),
    COMPANY_A,
    "no location keeps the membership company",
  );

  assertTrue(isMissingSchemaError({ code: "PGRST204" }), "missing column is a fallback");
  assertTrue(
    isMissingSchemaError({ message: "column public.example does not exist", code: "42703" }),
    "Postgres missing-column message is a fallback",
  );
  assertFalse(
    isMissingSchemaError({ code: "42501", message: "permission denied" }),
    "permission errors stay errors",
  );

  const calls: Array<[string, string]> = [];
  const query = {
    eq(column: string, value: string) {
      calls.push([column, value]);
      return this;
    },
  };
  withLocationId(query, LOCATION_A);
  withLocationId(query, null);
  assertEqual(calls, [["location_id", LOCATION_A]], "withLocationId only applies a present id");

  assertEqual(
    locationStorageKey("user-1"),
    "gleami.selectedLocationId.user-1",
    "storage key is per user",
  );

  const STORED_TYPO = "8e4ec818-b8ea-4918-b6ba-836ed4074d20";
  const REAL_PRIMARY = "8e4ce818-b8ea-4918-b6ba-836ed4074d20";
  assertEqual(
    pickSelectedLocationId({
      accessibleIds: [REAL_PRIMARY],
      persistedId: STORED_TYPO,
      fallbackId: REAL_PRIMARY,
      primaryId: REAL_PRIMARY,
    }),
    REAL_PRIMARY,
    "typo'd stored location id falls back to the sole / primary location",
  );

  const memory: Record<string, string> = {
    [locationStorageKey("user-1")]: STORED_TYPO,
  };
  const originalWindow = globalThis.window;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => memory[key] ?? null,
      setItem: (key: string, value: string) => {
        memory[key] = value;
      },
      removeItem: (key: string) => {
        delete memory[key];
      },
    },
  };
  try {
    assertEqual(
      resolvePersistedLocationId("user-1", [REAL_PRIMARY]),
      null,
      "stored id that is not in the loaded list is discarded",
    );
    assertEqual(
      memory[locationStorageKey("user-1")],
      undefined,
      "bad localStorage location id is wiped",
    );

    memory[locationStorageKey("user-1")] = REAL_PRIMARY;
    assertEqual(
      resolvePersistedLocationId("user-1", []),
      REAL_PRIMARY,
      "empty accessible list does not wipe storage (locations still loading)",
    );
    assertEqual(
      memory[locationStorageKey("user-1")],
      REAL_PRIMARY,
      "stored id survives empty accessible hydrate",
    );

    delete memory[locationStorageKey("user-1")];
    assertEqual(
      settleLocationSelection({
        userId: "user-1",
        accessibleIds: [REAL_PRIMARY],
        persistedId: null,
        fallbackId: null,
        primaryId: REAL_PRIMARY,
      }),
      REAL_PRIMARY,
      "empty Safari storage still settles on primary / sole location",
    );
    assertEqual(
      memory[locationStorageKey("user-1")],
      REAL_PRIMARY,
      "auto-picked location is persisted",
    );
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  }
}

run();
console.log("location.test.ts passed");
