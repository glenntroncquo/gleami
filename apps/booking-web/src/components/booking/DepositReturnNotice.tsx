"use client";

import { useState } from "react";
import type { DepositReturn } from "@/lib/deposit";

/** Soft-fail banner after Stripe cancel/abandon. Success is owned by the widget. */
export function DepositReturnNotice({
  status,
}: {
  status: DepositReturn | null;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (status !== "cancel" || dismissed) {
    return null;
  }

  return (
    <div
      className="deposit-return-notice border-amber-200 bg-amber-50 text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div>
        <p className="text-sm font-semibold">Betaling geannuleerd</p>
        <p className="mt-0.5 text-sm opacity-90">
          Er is geen afspraak vastgelegd. Je kunt de boeking hieronder opnieuw
          afronden.
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium opacity-70 hover:opacity-100"
        onClick={() => setDismissed(true)}
      >
        Sluiten
      </button>
    </div>
  );
}
