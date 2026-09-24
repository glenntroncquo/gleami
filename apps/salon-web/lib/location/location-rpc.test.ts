import {
  buildLocationServiceCopies,
  copyPrimaryLocationServices,
  createLocation,
  fetchClientIdsForCompany,
  fetchCompanyLocations,
  offeredServiceIdsForLocation,
  updateLocation,
} from "./queries";
import {
  buildCreateLocationArgSets,
  buildUpdateLocationArgSets,
  normalizeLocationIds,
  normalizeLocationRecord,
} from "./rpc";
import type { LocationQueryError, LocationSupabase } from "./client";
import { DEFAULT_LOCATION_TIMEZONE } from "./types";

function assertEqual(actual: unknown, message: string, expected: unknown) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  if (actualText !== expectedText) {
    throw new Error(
      `${message}\n  expected: ${expectedText}\n  actual:   ${actualText}`,
    );
  }
}

const COMPANY = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const LOCATION = "11111111-1111-1111-1111-111111111111";
const PRIMARY = "22222222-2222-2222-2222-222222222222";
const SERVICE = "33333333-3333-3333-3333-333333333333";

const write = {
  name: "  Branch Two  ",
  city: "Gent",
  timezone: "Europe/Brussels",
};

function rpcClient(
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: LocationQueryError }>,
): LocationSupabase & { tableWrites: string[] } {
  const tableWrites: string[] = [];
  const client: LocationSupabase & { tableWrites: string[] } = {
    tableWrites,
    rpc,
    from() {
      const builder = {
        select() {
          return builder;
        },
        insert() {
          tableWrites.push("insert");
          return builder;
        },
        update() {
          tableWrites.push("update");
          return builder;
        },
        delete() {
          return builder;
        },
        eq() {
          return builder;
        },
        in() {
          return builder;
        },
        order() {
          return builder;
        },
        single: async () => ({
          data: null,
          error: { code: "42501", message: "permission denied" },
        }),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return builder as never;
    },
  };
  return client;
}

async function run() {
  const createArgs = buildCreateLocationArgSets(COMPANY, write);
  assertEqual(createArgs[0]?.p_company_id, "create uses p_company_id", COMPANY);
  assertEqual(createArgs[0]?.p_name, "create trims p_name", "Branch Two");
  assertEqual(
    createArgs[0]?.p_timezone,
    "create defaults timezone",
    DEFAULT_LOCATION_TIMEZONE,
  );

  const updateArgs = buildUpdateLocationArgSets(LOCATION, write);
  assertEqual(updateArgs[0]?.p_location_id, "update uses p_location_id", LOCATION);
  assertEqual(updateArgs[0]?.p_name, "update trims p_name", "Branch Two");

  assertEqual(
    normalizeLocationRecord(LOCATION, { company_id: COMPANY, name: "X" })?.id,
    "RPC uuid return is accepted",
    LOCATION,
  );
  assertEqual(
    normalizeLocationRecord([{ id: LOCATION, company_id: COMPANY, name: "HQ" }])?.name,
    "RPC row array is unwrapped",
    "HQ",
  );
  assertEqual(
    normalizeLocationIds([{ location_id: LOCATION }]),
    "id list from objects",
    [LOCATION],
  );

  const createClient = rpcClient(async (fn) => {
    if (fn === "create_location") {
      return {
        data: { id: LOCATION, company_id: COMPANY, name: "Branch Two" },
        error: null,
      };
    }
    return { data: null, error: { code: "PGRST202", message: "could not find the function" } };
  });
  const created = await createLocation(createClient, COMPANY, write);
  assertEqual(created.error, "create RPC success has no error", null);
  assertEqual(created.data?.id, "create returns the new location", LOCATION);
  assertEqual(createClient.tableWrites, "create does not POST /location", []);

  const forbiddenClient = rpcClient(async () => ({
    data: null,
    error: { code: "42501", message: "permission denied" },
  }));
  const forbidden = await createLocation(forbiddenClient, COMPANY, write);
  assertEqual(forbidden.data, "RPC 403 does not invent a row", null);
  assertEqual(Boolean(forbidden.error), "RPC 403 is surfaced", true);
  assertEqual(forbiddenClient.tableWrites, "RPC 403 does not fall back to table insert", []);

  const uuidClient = rpcClient(async (fn, args) => {
    if (fn === "create_location" && args && "p_company_id" in args && "p_name" in args) {
      return { data: LOCATION, error: null };
    }
    return { data: null, error: { code: "PGRST202", message: "with the specified" } };
  });
  const uuidOnly = await createLocation(uuidClient, COMPANY, write);
  assertEqual(uuidOnly.data?.id, "uuid-only create_location still hydrates a record", LOCATION);
  assertEqual(uuidClient.tableWrites, "uuid-only create stays on the RPC", []);

  const listRpcFns: string[] = [];
  const listRpcClient = rpcClient(async (fn) => {
    listRpcFns.push(fn);
    if (fn === "my_locations") {
      return {
        data: [
          {
            id: LOCATION,
            company_id: COMPANY,
            name: "HQ",
            is_primary: true,
          },
        ],
        error: null,
      };
    }
    return {
      data: null,
      error: { code: "PGRST202", message: "could not find the function" },
    };
  });
  const listFromRpc = await fetchCompanyLocations(listRpcClient, COMPANY);
  assertEqual(listRpcFns, "company locations call public.my_locations", ["my_locations"]);
  assertEqual(listFromRpc[0]?.id, "my_locations RPC returns the company location", LOCATION);
  assertEqual(listRpcClient.tableWrites, "my_locations success does not POST /location", []);

  const listClient = rpcClient(async (fn) => {
    if (fn === "my_locations") {
      return {
        data: null,
        error: { code: "PGRST202", message: "could not find the function public.my_locations" },
      };
    }
    return {
      data: null,
      error: { code: "PGRST202", message: "could not find the function" },
    };
  });
  listClient.from = () => {
    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      order() {
        return builder;
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({
          data: [
            {
              id: LOCATION,
              company_id: COMPANY,
              name: "HQ",
              is_primary: true,
            },
          ],
          error: null,
        }).then(resolve),
    };
    return builder as unknown as ReturnType<typeof listClient.from>;
  };
  const list = await fetchCompanyLocations(listClient, COMPANY);
  assertEqual(
    list[0]?.id,
    "company locations fall back to location table when my_locations 404s",
    LOCATION,
  );
  assertEqual(listClient.tableWrites, "list does not invent RPC writes", []);

  assertEqual(
    buildLocationServiceCopies([SERVICE, SERVICE, ""], LOCATION),
    "service copies are unique, skip blanks, and stay table-shaped",
    [{ service_id: SERVICE, location_id: LOCATION }],
  );

  const copyClient = rpcClient(async (fn) => {
    if (fn === "create_location") {
      return {
        data: { id: LOCATION, company_id: COMPANY, name: "Branch Two" },
        error: null,
      };
    }
    return { data: null, error: { code: "PGRST202", message: "could not find the function" } };
  });
  const copyInserts: { table: string; values: unknown }[] = [];
  copyClient.from = (table: string) => {
    const builder = {
      select() {
        return builder;
      },
      insert(values: Record<string, unknown> | Record<string, unknown>[]) {
        copyInserts.push({ table, values });
        copyClient.tableWrites.push("insert");
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq() {
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (table === "location") {
          return Promise.resolve({
            data: [{ id: PRIMARY }],
            error: null,
          }).then(resolve);
        }
        if (table === "location_service") {
          return Promise.resolve({
            data: [{ service_id: SERVICE }],
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return builder as ReturnType<typeof copyClient.from>;
  };
  const createdWithCopy = await createLocation(copyClient, COMPANY, write);
  assertEqual(createdWithCopy.error, "create still succeeds when services are copied", null);
  assertEqual(createdWithCopy.data?.id, "create still returns the new location", LOCATION);
  assertEqual(
    copyInserts,
    "create_location success copies primary location_service via table insert",
    [
      {
        table: "location_service",
        values: [{ service_id: SERVICE, location_id: LOCATION }],
      },
    ],
  );

  const copied = await copyPrimaryLocationServices(
    copyClient,
    COMPANY,
    LOCATION,
  );
  assertEqual(copied.copied, "direct copy inserts one location_service row", 1);
  assertEqual(copied.error, "direct copy has no error", null);

  const updated = await updateLocation(
    rpcClient(async (fn, args) => {
      if (fn === "update_location") {
        return { data: { id: LOCATION, name: args?.p_name ?? "Branch Two" }, error: null };
      }
      return { data: null, error: { code: "PGRST202", message: "could not find the function" } };
    }),
    LOCATION,
    write,
  );
  assertEqual(updated.error, "update goes through update_location", null);
  assertEqual(updated.data?.id, "update returns the location", LOCATION);

  const companyClientCalls: { table: string; select?: string; eq: [string, unknown][] }[] = [];
  const companyClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  companyClient.from = (table: string) => {
    const call: { table: string; select?: string; eq: [string, unknown][] } = {
      table,
      eq: [],
    };
    companyClientCalls.push(call);
    const builder = {
      select(columns: string) {
        call.select = columns;
        return builder;
      },
      insert() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq(column: string, value: string | boolean | number) {
        call.eq.push([column, value]);
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({
          data: [
            { client_id: "c1" },
            { client_id: "c1" },
            { client_id: "c2" },
          ],
          error: null,
        }).then(resolve),
    };
    return builder as ReturnType<typeof companyClient.from>;
  };
  const companyClients = await fetchClientIdsForCompany(companyClient, COMPANY);
  assertEqual(
    companyClients.data.slice().sort(),
    "company-wide clients are distinct client_location ids",
    ["c1", "c2"],
  );
  assertEqual(companyClients.tablePresent, "client_location is treated as present", true);
  assertEqual(companyClients.error, "company-wide client ids have no error", null);
  assertEqual(
    companyClientCalls.map((call) => call.table),
    "company-wide clients never read client_company",
    ["client_location"],
  );
  assertEqual(
    companyClientCalls[0]?.select?.includes("location:location_id!inner(company_id)"),
    "company-wide query joins location for company_id",
    true,
  );
  assertEqual(
    companyClientCalls[0]?.eq,
    "company-wide query filters location.company_id",
    [["location.company_id", COMPANY]],
  );

  const missingTableClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  missingTableClient.from = () => {
    const builder = {
      select() {
        return builder;
      },
      insert() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq() {
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: LocationQueryError }) => unknown) =>
        Promise.resolve({
          data: [],
          error: { code: "42P01", message: "relation client_location does not exist" },
        }).then(resolve),
    };
    return builder as ReturnType<typeof missingTableClient.from>;
  };
  const missingTable = await fetchClientIdsForCompany(missingTableClient, COMPANY);
  assertEqual(missingTable.data, "missing client_location returns no ids", []);
  assertEqual(missingTable.tablePresent, "missing client_location is not present", false);

  const unusedClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  assertEqual(
    await offeredServiceIdsForLocation(unusedClient, null),
    "no selected shop → do not filter the catalog",
    null,
  );

  const menuClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  menuClient.from = (table: string) => {
    const builder = {
      select() {
        return builder;
      },
      insert() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq() {
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({
          data: table === "location_service" ? [{ service_id: SERVICE }] : [],
          error: null,
        }).then(resolve),
    };
    return builder as ReturnType<typeof menuClient.from>;
  };
  assertEqual(
    await offeredServiceIdsForLocation(menuClient, LOCATION),
    "present location_service returns the shop menu",
    [SERVICE],
  );

  const emptyMenuClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  emptyMenuClient.from = () => {
    const builder = {
      select() {
        return builder;
      },
      insert() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq() {
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return builder as ReturnType<typeof emptyMenuClient.from>;
  };
  assertEqual(
    await offeredServiceIdsForLocation(emptyMenuClient, LOCATION),
    "empty location_service is an empty shop menu",
    [],
  );

  const missingMenuClient = rpcClient(async () => ({
    data: null,
    error: { message: "unused" },
  }));
  missingMenuClient.from = () => {
    const builder = {
      select() {
        return builder;
      },
      insert() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      eq() {
        return builder;
      },
      in() {
        return builder;
      },
      order() {
        return builder;
      },
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: { data: unknown; error: LocationQueryError }) => unknown) =>
        Promise.resolve({
          data: [],
          error: { code: "42P01", message: "relation location_service does not exist" },
        }).then(resolve),
    };
    return builder as ReturnType<typeof missingMenuClient.from>;
  };
  assertEqual(
    await offeredServiceIdsForLocation(missingMenuClient, LOCATION),
    "missing location_service does not filter the catalog",
    null,
  );
}

run().then(() => {
  console.log("location-rpc.test.ts passed");
});
