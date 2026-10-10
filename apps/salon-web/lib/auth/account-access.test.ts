import { EMPTY_MEMBERSHIP_SNAPSHOT } from "./membership-types";
import { scopeSnapshotToCompany } from "./membership-resolve";
import {
  accountDestinationPath,
  gateAccountPath,
  parseAccountSnapshot,
  resolveAccountDestination,
  type AccountSnapshot,
} from "./account-access";

const COMPANY_A = "11111111-1111-4111-8111-111111111111";
const COMPANY_B = "22222222-2222-4222-8222-222222222222";
const SETUP_A = "33333333-3333-4333-8333-333333333333";
const SETUP_B = "44444444-4444-4444-8444-444444444444";
const LOCATION_A = "55555555-5555-4555-8555-555555555555";
const LOCATION_B = "66666666-6666-4666-8666-666666666666";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(`${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`);
  }
}

function company(id: string, via: "company" | "location" = "company") {
  return { id, name: via === "location" ? "Location salon" : "Salon", via };
}

function draft(id: string, companyId: string, currentStep = 2) {
  return { id, companyId, name: "New salon", currentStep };
}

function ready(
  companies: Array<ReturnType<typeof company>>,
  drafts: Array<ReturnType<typeof draft>>,
  emailConfirmed = true,
): AccountSnapshot {
  return { ok: true, emailConfirmed, companies, drafts };
}

function destination(snapshot: AccountSnapshot, selectedCompanyId?: string | null, invitePath?: string | null) {
  return resolveAccountDestination({ snapshot, selectedCompanyId, invitePath });
}

function run() {
  assertEqual(
    destination({ ok: false, reason: "lookup_error" }).type,
    "lookup_error",
    "a membership lookup error stays a lookup error",
  );
  assertEqual(
    accountDestinationPath("en", { type: "lookup_error" }),
    "/en/account-unavailable",
    "lookup errors do not open setup",
  );
  assertEqual(
    destination({ ok: false, reason: "unauthenticated" }).type,
    "unauthenticated",
    "a missing session is not an empty membership",
  );

  assertEqual(
    destination(ready([], []), null, "/en/invite?token=abc"),
    { type: "invite", path: "/en/invite?token=abc" },
    "an invite destination wins over setup",
  );
  assertEqual(
    destination(ready([], [], false), null, "/en/invite?token=abc").type,
    "invite",
    "an invite destination wins over email verification",
  );
  assertEqual(
    destination(ready([], [], false)).type,
    "verify_email",
    "unconfirmed email does not start setup",
  );

  assertEqual(destination(ready([], [])), { type: "start_setup" }, "no salon and no draft starts setup");
  assertEqual(
    destination(ready([], [draft(SETUP_A, COMPANY_A, 4)])),
    { type: "resume_setup", setupId: SETUP_A },
    "a lone draft resumes at its saved step",
  );
  assertEqual(
    destination(ready([], [draft(SETUP_A, COMPANY_A), draft(SETUP_B, COMPANY_B)])).type,
    "choose_setup",
    "several drafts ask the person to choose",
  );

  assertEqual(
    destination(ready([company(COMPANY_A)], [])),
    { type: "enter_app", companyId: COMPANY_A, drafts: [] },
    "one established company opens the app",
  );
  assertEqual(
    destination(ready([company(COMPANY_A, "location")], [])),
    { type: "enter_app", companyId: COMPANY_A, drafts: [] },
    "an active location membership opens the app",
  );
  const keptDraft = draft(SETUP_B, COMPANY_B, 3);
  assertEqual(
    destination(ready([company(COMPANY_A)], [keptDraft])),
    { type: "enter_app", companyId: COMPANY_A, drafts: [keptDraft] },
    "an existing salon stays open while a new draft remains available",
  );

  assertEqual(
    destination(ready([company(COMPANY_A), company(COMPANY_B)], [])).type,
    "choose_salon",
    "several salons are not chosen by sorting ids",
  );
  assertEqual(
    destination(ready([company(COMPANY_A), company(COMPANY_B)], [keptDraft]), COMPANY_B),
    { type: "enter_app", companyId: COMPANY_B, drafts: [keptDraft] },
    "a chosen salon is the one that opens",
  );
  assertEqual(
    destination(ready([company(COMPANY_A)], []), COMPANY_B).type,
    "enter_app",
    "a stale salon choice falls back to the only established salon",
  );

  assertEqual(
    parseAccountSnapshot({ emailConfirmed: true, companies: [], drafts: [] }),
    ready([], []),
    "an explicit empty account is empty",
  );
  assertEqual(
    parseAccountSnapshot({ error: "unauthenticated" }).ok,
    false,
    "the workspace RPC can report a missing session",
  );
  assertEqual(
    parseAccountSnapshot(null),
    { ok: false, reason: "lookup_error" },
    "a missing payload is a lookup error",
  );
  assertEqual(
    parseAccountSnapshot({ emailConfirmed: true, companies: [{ id: "nope" }], drafts: [] }),
    { ok: false, reason: "lookup_error" },
    "a malformed company row is a lookup error",
  );

  assertEqual(
    gateAccountPath({
      pathname: "/en/calendar",
      locale: "en",
      destination: { type: "lookup_error" },
    }),
    { redirect: "/en/account-unavailable" },
    "protected pages fail closed when membership cannot be read",
  );
  assertEqual(
    gateAccountPath({
      pathname: "/en/calendar",
      locale: "en",
      destination: { type: "resume_setup", setupId: SETUP_A },
    }),
    { redirect: "/en/setup?draft=" + SETUP_A },
    "a draft-only account on a protected page resumes that draft",
  );
  assertEqual(
    gateAccountPath({
      pathname: "/en/calendar",
      locale: "en",
      destination: { type: "enter_app", companyId: COMPANY_A, drafts: [keptDraft] },
    }),
    { redirect: null },
    "an established salon plus a draft stays in the app",
  );
  assertEqual(
    gateAccountPath({
      pathname: "/en/setup",
      locale: "en",
      destination: { type: "enter_app", companyId: COMPANY_A, drafts: [keptDraft] },
    }),
    { redirect: null },
    "setup stays available from an established salon",
  );
  assertEqual(
    gateAccountPath({
      pathname: "/en/setup",
      locale: "en",
      destination: { type: "lookup_error" },
    }),
    { redirect: "/en/account-unavailable" },
    "setup does not open when the account could not be read",
  );
  assertEqual(
    gateAccountPath({
      pathname: "/en/login",
      locale: "en",
      destination: { type: "verify_email" },
    }),
    { redirect: null },
    "email verification stays on the login screen",
  );

  const scoped = scopeSnapshotToCompany(
    {
      ...EMPTY_MEMBERSHIP_SNAPSHOT,
      companyIds: [COMPANY_A, COMPANY_B],
      companyId: COMPANY_A,
      locationIds: [LOCATION_A, LOCATION_B],
      locationId: LOCATION_B,
      locationCompanies: [
        { id: LOCATION_A, company_id: COMPANY_A },
        { id: LOCATION_B, company_id: COMPANY_B },
      ],
      locationMemberships: [
        { location_id: LOCATION_A, role_id: "role", user_id: "user", is_active: true },
        { location_id: LOCATION_B, role_id: "role", user_id: "user", is_active: true },
      ],
    },
    COMPANY_A,
  );
  assertEqual(scoped.companyId, COMPANY_A, "the chosen company stays selected");
  assertEqual(scoped.locationIds, [LOCATION_A], "locations from the other salon are left out");
  assertEqual(scoped.locationId, LOCATION_A, "the open location belongs to the chosen salon");
}

run();
console.log("account-access.test.ts passed");
