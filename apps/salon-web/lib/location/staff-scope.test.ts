import {
  buildLocationMembershipInsert,
  pickLocationStaffRoleId,
  resolveWriteLocationId,
  staffIdsForLocationScope,
  withOptionalLocationFields,
} from "./staff-scope";

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

const STYLIST = "role-stylist";
const STAFF = "role-staff";
const MANAGER = "role-manager";
const LOCATION_A = "11111111-1111-1111-1111-111111111111";
const LOCATION_B = "22222222-2222-2222-2222-222222222222";
const STAFF_ID = "staff-1";
const USER_ID = "user-1";

function run() {
  assertEqual(
    pickLocationStaffRoleId([
      { id: MANAGER, name: "manager" },
      { id: STAFF, name: "staff" },
      { id: STYLIST, name: "stylist" },
    ]),
    STYLIST,
    "stylist wins over staff/manager",
  );
  assertEqual(
    pickLocationStaffRoleId([{ id: MANAGER, name: "manager" }, { id: STAFF, name: "staff" }]),
    STAFF,
    "staff is used when stylist is absent",
  );
  assertEqual(
    pickLocationStaffRoleId([{ id: MANAGER, name: "manager" }]),
    MANAGER,
    "any location-scoped system role is a last resort",
  );
  assertEqual(pickLocationStaffRoleId([]), null, "no roles → no id");
  assertEqual(
    pickLocationStaffRoleId([], STYLIST),
    STYLIST,
    "explicit fallback is used when the catalog is empty",
  );

  assertEqual(
    buildLocationMembershipInsert({
      locationId: LOCATION_B,
      roleId: STYLIST,
      staffId: STAFF_ID,
    }),
    {
      location_id: LOCATION_B,
      role_id: STYLIST,
      staff_id: STAFF_ID,
      is_active: true,
    },
    "new staff without a login still get staff_id on the membership",
  );
  assertEqual(
    buildLocationMembershipInsert({
      locationId: LOCATION_B,
      roleId: STAFF,
      staffId: STAFF_ID,
      userId: USER_ID,
    }),
    {
      location_id: LOCATION_B,
      role_id: STAFF,
      staff_id: STAFF_ID,
      is_active: true,
      user_id: USER_ID,
    },
    "staff.user_id is linked when the column/value exists",
  );

  assertEqual(
    staffIdsForLocationScope(null, true),
    null,
    "missing table / timeout stays unscoped even in multi-location",
  );
  assertEqual(
    staffIdsForLocationScope([], false),
    null,
    "empty memberships on a 1:1 tenant still fail-open to company staff",
  );
  assertEqual(
    staffIdsForLocationScope([], true),
    [],
    "empty memberships at a multi-location shop are an empty roster",
  );
  assertEqual(
    staffIdsForLocationScope([STAFF_ID], true),
    [STAFF_ID],
    "present memberships filter the roster",
  );

  assertEqual(
    resolveWriteLocationId(LOCATION_B, LOCATION_A),
    LOCATION_B,
    "selected shop wins over the existing appointment location",
  );
  assertEqual(
    resolveWriteLocationId(null, LOCATION_A),
    LOCATION_A,
    "existing appointment location is kept when none is selected",
  );
  assertEqual(
    resolveWriteLocationId("  ", "  "),
    null,
    "blank selected / existing ids do not invent a location",
  );

  assertEqual(
    withOptionalLocationFields(
      { staff_id: STAFF_ID, company_id: "co" },
      LOCATION_B,
    ),
    { staff_id: STAFF_ID, company_id: "co", location_id: LOCATION_B },
    "schedule writes include the selected location",
  );
  assertEqual(
    withOptionalLocationFields({ start: "2026-09-06T10:00:00" }, LOCATION_B),
    { start: "2026-09-06T10:00:00", location_id: LOCATION_B },
    "appointment update includes location_id",
  );
  assertEqual(
    withOptionalLocationFields({ staff_id: STAFF_ID, company_id: "co" }, null),
    { staff_id: STAFF_ID, company_id: "co" },
    "1:1 / no selected location keeps company-only inserts",
  );
}

run();
console.log("staff-scope.test.ts passed");
