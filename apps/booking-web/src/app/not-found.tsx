import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6">
      <p className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
        Salonify
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-neutral-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-neutral-500">
        This booking link is invalid or no longer available.
      </p>
    </div>
  );
}
