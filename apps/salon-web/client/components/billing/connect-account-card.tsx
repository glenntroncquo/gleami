"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deriveConnectStatus,
  fetchCompanyPaymentAccount,
  startStripeConnectOnboard,
  type ConnectStatus,
  type ConnectStatusKind,
} from "@/lib/api/billing";
import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  startFailClosedWait,
  withTimeout,
} from "@/lib/async/fail-closed";
import { useCompanyId } from "@/lib/company-util";
import { useAuth } from "@/providers/auth-provider";

const STATUS_BADGE_VARIANT: Record<
  ConnectStatusKind,
  "default" | "secondary" | "destructive" | "outline"
> = {
  not_connected: "outline",
  needs_onboarding: "secondary",
  restricted: "destructive",
  ready: "default",
};

function ctaLabel(
  kind: ConnectStatusKind,
  t: (key: string) => string,
) {
  if (kind === "not_connected") return t("connect.startOnboarding");
  if (kind === "needs_onboarding") return t("connect.continueOnboarding");
  if (kind === "restricted") return t("connect.completeSetup");
  return t("connect.updateAccount");
}

function flagLabel(enabled: boolean, enabledLabel: string, disabledLabel: string) {
  return enabled ? enabledLabel : disabledLabel;
}

export function ConnectAccountCard() {
  const t = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = useCompanyId();
  const { hasCompanyPermission, membershipReady } = useAuth();
  const canManage =
    !membershipReady || hasCompanyPermission("billing:manage");

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const handledConnectRef = useRef<string | null>(null);

  const loadAccount = useCallback(
    (isCancelled?: () => boolean) => {
      if (!companyId || !hasCompanyPermission("billing:manage")) {
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
            toast.error(t("connect.loadFailed"));
            setStatus(null);
            setLoadError(true);
            return;
          }
          setStatus(deriveConnectStatus(result.data));
        },
        { label: "billing-connect" },
      );
    },
    [companyId, hasCompanyPermission, t],
  );

  useEffect(() => {
    if (!membershipReady && !companyId) {
      return startFailClosedWait(setLoading, { label: "billing-hydrate" });
    }
    return loadAccount();
  }, [companyId, loadAccount, membershipReady]);

  const startOnboarding = useCallback(async () => {
    if (!companyId || !hasCompanyPermission("billing:manage")) return;
    setStarting(true);
    const result = await startStripeConnectOnboard({
      companyId,
      origin: window.location.origin,
      locale,
    });

    if (result.url) {
      window.location.assign(result.url);
      return;
    }

    if (result.error) {
      toast.error(result.error || t("connect.onboardFailed"));
      setStarting(false);
      return;
    }

    loadAccount();
    setStarting(false);
  }, [companyId, hasCompanyPermission, loadAccount, locale, t]);

  useEffect(() => {
    if (!membershipReady || !hasCompanyPermission("billing:manage")) return;
    const connect = searchParams.get("connect");
    if (!connect || handledConnectRef.current === connect) return;
    handledConnectRef.current = connect;
    router.replace(`/${locale}/billing`);

    if (connect === "refresh") {
      toast.message(t("connect.refreshNeeded"));
      void startOnboarding();
      return;
    }

    if (connect === "return") {
      toast.success(t("connect.returned"));
    }
  }, [
    hasCompanyPermission,
    locale,
    membershipReady,
    router,
    searchParams,
    startOnboarding,
    t,
  ]);

  if (membershipReady && !hasCompanyPermission("billing:manage")) {
    return (
      <ConnectCard title={t("connect.title")} description={t("connect.noAccess")} />
    );
  }

  if (membershipReady && !companyId) {
    return (
      <ConnectCard title={t("connect.title")} description={t("connect.noCompany")} />
    );
  }

  if (loadError && !status) {
    return (
      <ConnectCard title={t("connect.title")} description={t("connect.description")}>
        <p className="text-muted-foreground text-sm">{t("connect.loadFailed")}</p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => loadAccount()}>
            {t("connect.retry")}
          </Button>
        </div>
      </ConnectCard>
    );
  }

  if (loading || !status) {
    return (
      <ConnectCard title={t("connect.title")} description={t("connect.description")}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
      </ConnectCard>
    );
  }

  return (
    <ConnectCard title={t("connect.title")} description={t("connect.description")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t("connect.statusLabel")}</p>
            <Badge variant={STATUS_BADGE_VARIANT[status.kind]}>
              {statusLabel(status.kind, t)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {statusHint(status.kind, t)}
          </p>
        </div>
      </div>

      <Separator />

      <StatusRow
        label={t("connect.charges")}
        value={flagLabel(
          status.chargesEnabled,
          t("connect.enabled"),
          t("connect.disabled"),
        )}
      />
      <StatusRow
        label={t("connect.payouts")}
        value={flagLabel(
          status.payoutsEnabled,
          t("connect.enabled"),
          t("connect.disabled"),
        )}
      />
      <StatusRow
        label={t("connect.details")}
        value={
          status.detailsSubmitted
            ? t("connect.submitted")
            : t("connect.incomplete")
        }
      />
      {status.providerAccountId && (
        <StatusRow
          label={t("connect.accountId")}
          value={status.providerAccountId}
        />
      )}
      {status.updatedAt && (
        <StatusRow
          label={t("connect.lastUpdated")}
          value={new Date(status.updatedAt).toLocaleString()}
        />
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => void startOnboarding()} disabled={starting}>
            {starting && (
              <RiLoader4Line size={16} className="animate-spin" />
            )}
            {starting ? t("connect.starting") : ctaLabel(status.kind, t)}
          </Button>
        </div>
      )}
    </ConnectCard>
  );
}

function statusLabel(kind: ConnectStatusKind, t: (key: string) => string) {
  if (kind === "not_connected") return t("connect.status.notConnected");
  if (kind === "needs_onboarding") return t("connect.status.needsOnboarding");
  if (kind === "restricted") return t("connect.status.restricted");
  return t("connect.status.ready");
}

function statusHint(kind: ConnectStatusKind, t: (key: string) => string) {
  if (kind === "not_connected") return t("connect.statusHint.notConnected");
  if (kind === "needs_onboarding") return t("connect.statusHint.needsOnboarding");
  if (kind === "restricted") return t("connect.statusHint.restricted");
  return t("connect.statusHint.ready");
}

function ConnectCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children ? <div className="space-y-5 px-6 py-6">{children}</div> : null}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-sm">{value}</p>
    </div>
  );
}