import {
  HYDRATE_WAIT_TIMEOUT_MS,
  LOCATION_SCOPE_TIMEOUT_MS,
  PAGE_FETCH_TIMEOUT_MS,
  TimeoutError,
  resolveLocationScopeIds,
  startFailClosedLoad,
  startFailClosedWait,
  withTimeout,
} from "./fail-closed";

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
    throw new Error(
      `${message}\n  expected: true\n  actual:   ${JSON.stringify(value)}`,
    );
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function neverSettle<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

async function run() {
  assertEqual(PAGE_FETCH_TIMEOUT_MS, 8000, "page timeout is 8s");
  assertEqual(LOCATION_SCOPE_TIMEOUT_MS, 4000, "scope timeout is 4s");
  assertEqual(HYDRATE_WAIT_TIMEOUT_MS, 4000, "hydrate wait is 4s");

  const resolved = await withTimeout(Promise.resolve(7), 50, "ok");
  assertEqual(resolved, 7, "withTimeout resolves on time");

  let timedOut = false;
  try {
    await withTimeout(neverSettle(), 20, "hung query");
  } catch (error) {
    timedOut = error instanceof TimeoutError;
    assertTrue(
      error instanceof TimeoutError &&
        error.message.includes("hung query timed out after 20ms"),
      "withTimeout rejects TimeoutError",
    );
  }
  assertTrue(timedOut, "hung promise times out");

  const unscopedMissing = await resolveLocationScopeIds(async () => ({
    data: ["a"],
    tablePresent: false,
  }));
  assertEqual(unscopedMissing, null, "missing table → unscoped");

  const emptyScoped = await resolveLocationScopeIds(async () => ({
    data: [],
    tablePresent: true,
  }));
  assertEqual(emptyScoped, [], "present table + no ids → empty scope");

  const scoped = await resolveLocationScopeIds(async () => ({
    data: ["staff-1"],
    tablePresent: true,
  }));
  assertEqual(scoped, ["staff-1"], "present table + ids → filter");

  const hungScope = await resolveLocationScopeIds(
    () => neverSettle(),
    "staff location scope",
    20,
  );
  assertEqual(hungScope, null, "hung scope → unscoped, not stuck");

  const loads: boolean[] = [];
  const stop = startFailClosedLoad(
    (loading) => {
      loads.push(loading);
    },
    async () => {
      await delay(10);
    },
    { timeoutMs: 200, label: "unit" },
  );
  await delay(40);
  stop();
  assertEqual(loads, [false], "successful work clears loading once");

  const hungLoads: boolean[] = [];
  const stopHung = startFailClosedLoad(
    (loading) => {
      hungLoads.push(loading);
    },
    async () => neverSettle(),
    { timeoutMs: 25, label: "hung page" },
  );
  await delay(60);
  stopHung();
  assertEqual(hungLoads, [false], "hung work still clears loading");

  const cancelledLoads: boolean[] = [];
  let workSawCancel = false;
  const stopCancel = startFailClosedLoad(
    (loading) => {
      cancelledLoads.push(loading);
    },
    async (isCancelled) => {
      await delay(40);
      workSawCancel = isCancelled();
    },
    { timeoutMs: 200, label: "cancelled" },
  );
  await delay(5);
  stopCancel();
  await delay(50);
  assertTrue(workSawCancel, "cleanup marks work cancelled");
  assertEqual(
    cancelledLoads,
    [],
    "cleanup does not flip loading (next effect owns it)",
  );

  const waitLoads: boolean[] = [];
  const stopWait = startFailClosedWait(
    (loading) => {
      waitLoads.push(loading);
    },
    { timeoutMs: 25, label: "wait-company" },
  );
  await delay(60);
  stopWait();
  assertEqual(
    waitLoads,
    [false],
    "hydrate wait still clears loading when companyId never arrives",
  );

  console.log("fail-closed tests passed");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
