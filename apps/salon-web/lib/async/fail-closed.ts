/** Page-level Laden… failsafe. Hung PostgREST / Web Locks must not stick forever. */
export const PAGE_FETCH_TIMEOUT_MS = 8000;

/** Membership hydrate wait. Do not wait on locationId — companyId is enough. */
export const HYDRATE_WAIT_TIMEOUT_MS = 4000;

/** Location membership scope is optional; abandon it sooner and load unscoped. */
export const LOCATION_SCOPE_TIMEOUT_MS = 4000;

export class TimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms = PAGE_FETCH_TIMEOUT_MS,
  label = "request",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(label, ms));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export type LocationScopeResult = {
  data: string[];
  tablePresent: boolean;
};

/**
 * Resolve location-scoped ids. `null` means "do not filter" (missing table,
 * timeout, or error — fail-open so the page still loads). `[]` means scoped
 * empty (show no rows).
 */
export async function resolveLocationScopeIds(
  fetchIds: () => PromiseLike<LocationScopeResult>,
  label = "location scope",
  timeoutMs = LOCATION_SCOPE_TIMEOUT_MS,
): Promise<string[] | null> {
  try {
    const scoped = await withTimeout(
      fetchIds(),
      timeoutMs,
      label,
    );
    if (!scoped.tablePresent) return null;
    return scoped.data;
  } catch (error) {
    console.warn(`${label} failed; loading unscoped`, error);
    return null;
  }
}

/**
 * Run page-load work and always clear `loading`, even if `work` hangs.
 * Cleanup ignores late `setLoading` / should ignore late `setData` via
 * the `isCancelled` flag passed to `work`.
 */
export function startFailClosedLoad(
  setLoading: (loading: boolean) => void,
  work: (isCancelled: () => boolean) => Promise<void>,
  options?: { timeoutMs?: number; label?: string },
): () => void {
  let cancelled = false;
  const timeoutMs = options?.timeoutMs ?? PAGE_FETCH_TIMEOUT_MS;
  const label = options?.label ?? "page";

  const timer = setTimeout(() => {
    if (cancelled) return;
    console.warn(
      `[${label}] load timed out after ${timeoutMs}ms; clearing loading`,
    );
    setLoading(false);
  }, timeoutMs);

  void (async () => {
    try {
      await work(() => cancelled);
    } catch (error) {
      if (!cancelled) {
        console.error(`[${label}] load failed`, error);
      }
    } finally {
      clearTimeout(timer);
      if (!cancelled) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}

/**
 * Keep a skeleton only while company/membership is still hydrating.
 * Never use this to wait for locationId — that is what stuck Safari
 * calendar staff columns after the staff XHR had already completed.
 */
export function startFailClosedWait(
  setLoading: (loading: boolean) => void,
  options?: { timeoutMs?: number; label?: string },
): () => void {
  return startFailClosedLoad(
    setLoading,
    () => new Promise<void>(() => {}),
    {
      timeoutMs: options?.timeoutMs ?? HYDRATE_WAIT_TIMEOUT_MS,
      label: options?.label ?? "hydrate-wait",
    },
  );
}
