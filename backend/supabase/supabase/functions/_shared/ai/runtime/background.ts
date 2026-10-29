type EdgeRuntimeGlobal = { EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void } };

/** Keeps the isolate alive after the response is sent until `promise` settles. */
export function runInBackground(promise: Promise<unknown>): void {
  const runtime = (globalThis as EdgeRuntimeGlobal).EdgeRuntime;
  if (runtime) {
    runtime.waitUntil(promise);
  }
}
