import {
  collectPermissionKeys,
  evaluateHasCompanyPermission,
  evaluateHasPermission,
  isMissingRpcError,
  membershipRoleIds,
  normalizeRpcUuidList,
  pickCurrentId,
  resolveCompanyIds,
  resolveLocationIds,
  snapshotHasAnyPermission,
  snapshotHasCompanyPermission,
  snapshotHasPermission,
  uniqueSorted,
} from "./membership-resolve";
import { assembleMembershipSnapshot, parseMyMemberships } from "./membership-client";
import { EMPTY_MEMBERSHIP_SNAPSHOT, type MembershipSnapshot } from "./membership-types";

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

const OWNER_ROLE = "role-owner";
const STYLIST_ROLE = "role-stylist";
const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const COMPANY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const LOCATION_A = "11111111-1111-1111-1111-111111111111";
const LOCATION_B = "22222222-2222-2222-2222-222222222222";
const USER = "user-1";

const ownerPermissions = [
  "billing:manage",
  "calendar:read",
  "calendar:write",
  "catalog:manage",
  "clients:manage",
  "clients:read",
  "invites:manage",
  "locations:manage",
  "locations:read",
  "pos:manage",
  "pos:read",
  "pos:refund",
  "schedule:manage",
  "settings:manage",
  "staff:manage",
] as const;

function run() {
  assertEqual(uniqueSorted(["b", "a", "b", ""]), ["a", "b"], "uniqueSorted de-dupes and sorts");
  assertEqual(pickCurrentId([COMPANY_B, COMPANY_A]), COMPANY_A, "1:1 pick is the sorted first id");
  assertEqual(pickCurrentId([]), null, "empty list has no current id");

  assertEqual(
    normalizeRpcUuidList([COMPANY_A, { my_company_ids: COMPANY_B }]),
    [COMPANY_A, COMPANY_B],
    "RPC uuid lists accept raw uuids and row objects",
  );
  assertEqual(normalizeRpcUuidList(null), [], "null RPC payload is empty");
  assertTrue(isMissingRpcError({ code: "PGRST202" }), "PostgREST missing function is a fallback");
  assertTrue(
    isMissingRpcError({ code: "404", message: "Could not find the function public.my_locations" }),
    "HTTP 404 on a missing public RPC is a fallback",
  );
  assertTrue(
    isMissingRpcError({ message: "function public.has_permission does not exist" }),
    "Postgres 42883-style message is a fallback",
  );
  assertFalse(isMissingRpcError({ code: "42501", message: "permission denied" }), "other errors stay errors");

  assertEqual(
    resolveCompanyIds({
      companyMemberships: [
        { company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER },
      ],
      locationCompanies: [],
    }),
    [COMPANY_A],
    "owner company comes from company_membership",
  );

  assertEqual(
    resolveCompanyIds({
      rpcCompanyIds: [COMPANY_B],
      companyMemberships: [
        { company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER },
      ],
      locationCompanies: [],
    }),
    [COMPANY_B],
    "RPC my_company_ids wins when present",
  );

  assertEqual(
    resolveCompanyIds({
      companyMemberships: [],
      locationCompanies: [{ id: LOCATION_A, company_id: COMPANY_A }],
    }),
    [COMPANY_A],
    "location-only membership still resolves the company",
  );

  assertEqual(
    resolveLocationIds({
      locationMemberships: [
        {
          location_id: LOCATION_A,
          role_id: STYLIST_ROLE,
          user_id: USER,
          is_active: true,
        },
        {
          location_id: LOCATION_B,
          role_id: STYLIST_ROLE,
          user_id: USER,
          is_active: false,
        },
      ],
      locationCompanies: [{ id: LOCATION_A, company_id: COMPANY_A }],
    }),
    [LOCATION_A],
    "inactive location_membership is ignored",
  );

  assertEqual(
    resolveLocationIds({
      locationMemberships: [],
      locationCompanies: [
        { id: LOCATION_A, company_id: COMPANY_A },
        { id: LOCATION_B, company_id: COMPANY_A },
      ],
    }),
    [LOCATION_A, LOCATION_B],
    "company owner inherits every location of that company",
  );

  const ownerRolePermissions = ownerPermissions.map((permission_key) => ({
    role_id: OWNER_ROLE,
    permission_key,
  }));

  const stylistRolePermissions = [
    { role_id: STYLIST_ROLE, permission_key: "calendar:read" },
    { role_id: STYLIST_ROLE, permission_key: "calendar:write" },
    { role_id: STYLIST_ROLE, permission_key: "clients:read" },
    { role_id: STYLIST_ROLE, permission_key: "pos:read" },
  ];

  assertEqual(
    collectPermissionKeys([OWNER_ROLE], ownerRolePermissions),
    [...ownerPermissions],
    "owner role receives the full catalog (Sandra / Ana Paula / Anapaula)",
  );

  assertEqual(
    collectPermissionKeys(
      membershipRoleIds(
        [{ company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER }],
        [],
      ),
      ownerRolePermissions,
    ).includes("pos:manage"),
    true,
    "owner accounts keep POS manage",
  );

  const ownerSnapshot: MembershipSnapshot = {
    ...EMPTY_MEMBERSHIP_SNAPSHOT,
    companyIds: [COMPANY_A],
    companyId: COMPANY_A,
    locationIds: [LOCATION_A],
    locationId: LOCATION_A,
    permissionKeys: collectPermissionKeys([OWNER_ROLE], ownerRolePermissions),
    rolePermissions: ownerRolePermissions,
    companyMemberships: [
      { company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER },
    ],
    locationCompanies: [{ id: LOCATION_A, company_id: COMPANY_A }],
  };

  assertTrue(
    snapshotHasPermission(ownerSnapshot, "calendar:read"),
    "owner calendar:read via session keys",
  );
  assertTrue(
    snapshotHasPermission(ownerSnapshot, "calendar:write", LOCATION_A),
    "owner inherits location permission through company_membership",
  );
  assertTrue(
    snapshotHasCompanyPermission(ownerSnapshot, "settings:manage"),
    "owner settings:manage via company role",
  );
  assertTrue(
    snapshotHasAnyPermission(ownerSnapshot, ["pos:read", "pos:manage"]),
    "owner keeps POS nav",
  );

  assertTrue(
    evaluateHasPermission({
      perm: "calendar:write",
      locationId: LOCATION_A,
      snapshot: ownerSnapshot,
      rolePermissions: ownerRolePermissions,
    }),
    "has_permission(calendar:write, location) true for owner",
  );
  assertFalse(
    evaluateHasPermission({
      perm: "calendar:write",
      locationId: LOCATION_B,
      snapshot: ownerSnapshot,
      rolePermissions: ownerRolePermissions,
    }),
    "has_permission does not leak to another location",
  );
  assertFalse(
    evaluateHasCompanyPermission({
      perm: "billing:manage",
      companyId: COMPANY_B,
      snapshot: ownerSnapshot,
      rolePermissions: ownerRolePermissions,
    }),
    "has_company_permission does not leak across companies",
  );

  const stylistSnapshot: MembershipSnapshot = {
    ...EMPTY_MEMBERSHIP_SNAPSHOT,
    companyIds: [COMPANY_A],
    companyId: COMPANY_A,
    locationIds: [LOCATION_A],
    locationId: LOCATION_A,
    permissionKeys: collectPermissionKeys([STYLIST_ROLE], stylistRolePermissions),
    rolePermissions: stylistRolePermissions,
    locationMemberships: [
      {
        location_id: LOCATION_A,
        role_id: STYLIST_ROLE,
        user_id: USER,
        is_active: true,
      },
    ],
    locationCompanies: [{ id: LOCATION_A, company_id: COMPANY_A }],
  };

  assertTrue(
    snapshotHasPermission(stylistSnapshot, "calendar:read", LOCATION_A),
    "stylist can read calendar at their location",
  );
  assertFalse(
    snapshotHasCompanyPermission(stylistSnapshot, "settings:manage"),
    "stylist does not get company settings:manage",
  );
  assertFalse(
    snapshotHasPermission(stylistSnapshot, "staff:manage"),
    "stylist does not get staff:manage nav",
  );

  const companyOnly = assembleMembershipSnapshot({
    companyMemberships: [
      { company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER },
    ],
    locationMemberships: [],
    locationCompanies: [],
  });
  assertEqual(
    companyOnly.companyId,
    COMPANY_A,
    "companyId is set from company_membership even when locations are empty",
  );
  assertEqual(
    companyOnly.locationIds,
    [],
    "missing location rows do not block the company snapshot",
  );

  const parsed = parseMyMemberships(
    [
      {
        source: "company",
        company_id: COMPANY_A,
        location_id: null,
        role_id: OWNER_ROLE,
        is_active: true,
      },
      {
        source: "location",
        company_id: COMPANY_A,
        location_id: LOCATION_A,
        role_id: STYLIST_ROLE,
        is_active: true,
      },
    ],
    USER,
  );
  assertEqual(
    parsed.companyMemberships.map((row) => row.company_id),
    [COMPANY_A],
    "my_memberships company rows become company_membership",
  );
  assertEqual(
    parsed.locationMemberships.map((row) => row.location_id),
    [LOCATION_A],
    "my_memberships location rows become location_membership",
  );
}

async function runAsync() {
  const COMPANY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const USER = "user-1";
  const OWNER_ROLE = "role-owner";

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.includes("/rest/v1/company_membership")) {
      throw new Error(`unexpected fetch ${url}`);
    }
    return new Response(
      JSON.stringify([
        { company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const { fetchCompanyMembershipsWithToken, loadMembershipSnapshot } =
      await import("./membership-client");
    const rows = await fetchCompanyMembershipsWithToken({
      access_token: "jwt-from-session",
      user: { id: USER },
    });
    assertEqual(
      rows.map((row) => row.company_id),
      [COMPANY_A],
      "lock-free company_membership uses the session JWT",
    );

    const rpcCalls: string[] = [];
    const snapshot = await loadMembershipSnapshot(
      {
        rpc: async (fn: string) => {
          rpcCalls.push(fn);
          return {
            data: null,
            error: { code: "PGRST202", message: `could not find the function ${fn}` },
          };
        },
        from: (table: string) => {
          const rowsForTable =
            table === "company_membership"
              ? [{ company_id: COMPANY_A, role_id: OWNER_ROLE, user_id: USER }]
              : [];
          const builder = {
            select() {
              return builder;
            },
            eq() {
              return builder;
            },
            in() {
              return builder;
            },
            then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
              Promise.resolve({ data: rowsForTable, error: null }).then(resolve),
          };
          return builder;
        },
      } as never,
      USER,
    );
    assertEqual(
      [...rpcCalls].sort(),
      ["my_company_ids", "my_location_ids", "my_locations", "my_memberships"],
      "hydrate calls only public my_* RPCs",
    );
    assertFalse(
      rpcCalls.some(
        (fn) => fn === "company_ids_for_user" || fn === "location_ids_for_user",
      ),
      "hydrate never calls private RPC names",
    );
    assertEqual(
      snapshot.companyId,
      COMPANY_A,
      "table fallback sets companyId when public RPCs 404",
    );

    const rpcSnapshot = await loadMembershipSnapshot(
      {
        rpc: async (fn: string) => {
          if (fn === "my_memberships") {
            return {
              data: [
                {
                  source: "company",
                  company_id: COMPANY_A,
                  location_id: null,
                  role_id: OWNER_ROLE,
                  is_active: true,
                },
              ],
              error: null,
            };
          }
          if (fn === "my_company_ids") {
            return { data: [COMPANY_A], error: null };
          }
          if (fn === "my_location_ids") {
            return { data: [], error: null };
          }
          if (fn === "my_locations") {
            return { data: [], error: null };
          }
          throw new Error(`unexpected RPC ${fn}`);
        },
        from: (table: string) => {
          const builder = {
            select() {
              return builder;
            },
            eq() {
              return builder;
            },
            in() {
              return builder;
            },
            then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
              Promise.resolve({ data: [], error: null }).then(resolve),
          };
          return builder;
        },
      } as never,
      USER,
    );
    assertEqual(
      rpcSnapshot.companyId,
      COMPANY_A,
      "my_memberships / my_company_ids set companyId without table fallback",
    );
    assertEqual(rpcSnapshot.source, "rpc", "successful public RPCs mark source=rpc");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run();
void runAsync()
  .then(() => {
    console.log("membership.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
