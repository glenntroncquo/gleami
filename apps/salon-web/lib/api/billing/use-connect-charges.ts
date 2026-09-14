"use client";

import { useCallback, useEffect, useState } from "react";

import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";

import {
  canTakeCardCharges,
  deriveConnectStatus,
  fetchCompanyPaymentAccount,
  type ConnectStatus,
} from "./connect-account";

export function useConnectCharges(companyId: string | null) {
  const [loading, setLoading] = useState(!!companyId);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<ConnectStatus | null>(null);

  const reload = useCallback(
    (isCancelled?: () => boolean) => {
      if (!companyId) {
        setStatus(null);
        setLoadError(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(false);
      return startFailClosedLoad(
        setLoading,
        async (cancelled) => {
          const isDone = isCancelled ?? cancelled;
          const result = await withTimeout(
            fetchCompanyPaymentAccount(companyId),
            PAGE_FETCH_TIMEOUT_MS,
            "payment account",
          );
          if (isDone()) return;
          if (result.error) {
            setStatus(null);
            setLoadError(true);
            return;
          }
          setStatus(deriveConnectStatus(result.data));
        },
        { label: "pos-connect-charges" },
      );
    },
    [companyId],
  );

  useEffect(() => {
    return reload();
  }, [reload]);

  const chargesEnabled = status ? canTakeCardCharges(status) : false;

  return {
    chargesEnabled,
    statusKnown: status !== null && !loading,
    loading,
    loadError,
    status,
    reload,
  };
}
