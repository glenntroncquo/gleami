"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/types/supabase-types";
import { toast } from "sonner";

import { RiCloseLargeLine } from "@remixicon/react";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { useClientSearch, type ClientSearchResult } from "@/hooks/use-client-search";

type ReferralCodeRow = Tables<"referral_code">;

export function ReferralCodeSheet({
  open,
  onOpenChange,
  onCreated,
  referralCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  referralCode?: ReferralCodeRow | null;
}) {
  const t = useTranslations();
  const companyId = useCompanyId();
  const isMobile = useIsMobile();

  const [code, setCode] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [referrerClientId, setReferrerClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const clientSearch = useClientSearch({ companyId });
  const clientSearchClear = clientSearch.clear;
  const clientSearchSetSearchTerm = clientSearch.setSearchTerm;

  const canSave = useMemo(() => code.trim().length > 0 && !isSaving, [code, isSaving]);
  const isEdit = Boolean(referralCode?.id);

  useEffect(() => {
    if (!open) return;

    if (referralCode?.id) {
      setCode(referralCode.code ?? "");
      setExpiresAt(referralCode.expires_at ? referralCode.expires_at.slice(0, 10) : "");
      setIsActive(Boolean(referralCode.is_active ?? true));
      setReferrerClientId(referralCode.referrer_client_id ?? null);

      // Keep the search input deterministic without triggering search
      if (referralCode.referrer_client_id) {
        clientSearchSetSearchTerm(referralCode.referrer_client_id);
      } else {
        clientSearchClear();
      }
      return;
    }

    setCode("");
    setExpiresAt("");
    setIsActive(true);
    setReferrerClientId(null);
    clientSearchClear();
  }, [
    open,
    referralCode?.id,
    referralCode?.code,
    referralCode?.expires_at,
    referralCode?.is_active,
    referralCode?.referrer_client_id,
    clientSearchClear,
    clientSearchSetSearchTerm,
  ]);

  const reset = () => {
    setCode("");
    setExpiresAt("");
    setIsActive(true);
    setReferrerClientId(null);
    clientSearch.clear();
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const save = async () => {
    if (!canSave) return;
    if (!companyId) {
      toast.error(t("referrals.codes.createError"));
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      if (isEdit && referralCode?.id) {
        const payload: TablesUpdate<"referral_code"> = {
          code: code.trim(),
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          referrer_client_id: referrerClientId,
          is_active: isActive,
        };

        const { error } = await supabase
          .from("referral_code")
          .update(payload)
          .eq("id", referralCode.id)
          .eq("company_id", companyId);

        if (error) throw error;
        toast.success(t("referrals.codes.updateSuccess"));
      } else {
        const payload: TablesInsert<"referral_code"> = {
          company_id: companyId,
          code: code.trim(),
          is_active: true,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          referrer_client_id: referrerClientId,
        };

        const { error } = await supabase.from("referral_code").insert(payload);
        if (error) throw error;
        toast.success(t("referrals.codes.createSuccess"));
      }

      onCreated?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? t("referrals.codes.updateError") : t("referrals.codes.createError"));
    } finally {
      setIsSaving(false);
    }
  };

  const selectClient = (client: ClientSearchResult) => {
    setReferrerClientId(client.id);
    clientSearch.setSearchTerm(client.email);
    clientSearch.setShowDropdown(false);
    clientSearch.setResults([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={`[&>button:first-of-type]:hidden ${
          isMobile
            ? "h-[90vh] max-h-[90vh] rounded-t-xl border-t-2 border-t-gray-200 bg-white/95 backdrop-blur-sm"
            : "sm:top-4 sm:bottom-4 sm:right-4 sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border sm:border-border sm:overflow-hidden"
        }`}
      >
        <div className="border-b-1">
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-12 rounded-full bg-gray-300" />
            </div>
          )}
          <SheetHeader>
            <div className="flex w-full justify-between p-4">
              <SheetTitle className="text-xl font-bold">
                {isEdit
                  ? t("referrals.codes.sheet.editTitle")
                  : t("referrals.codes.sheet.title")}
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-6 w-6 text-gray-500"
                aria-label="Close"
              >
                <RiCloseLargeLine size={20} />
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div
          className={`grid gap-4 overflow-y-auto ${isMobile ? "px-4 pb-4" : "p-4"}`}
          style={{
            maxHeight: isMobile ? "calc(90vh - 200px)" : "calc(100vh - 200px)",
          }}
        >
          <div className="*:not-first:mt-1.5">
            <Label htmlFor="referral-code">{t("referrals.codes.fields.code")}</Label>
            <Input
              id="referral-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("referrals.codes.fields.codePlaceholder")}
              className="text-base"
            />
          </div>

          <div className="*:not-first:mt-1.5">
            <Label htmlFor="referral-expires">{t("referrals.codes.fields.expiresAt")}</Label>
            <Input
              id="referral-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="text-base"
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between gap-3 rounded-md border p-4">
              <div>
                <div className="font-medium">{t("referrals.codes.fields.active")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("referrals.codes.fields.activeDescription")}
                </div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="*:not-first:mt-1.5 relative">
            <Label htmlFor="referrer-search">{t("referrals.codes.fields.referrer")}</Label>
            <div className="relative">
              <Input
                id="referrer-search"
                placeholder={t("referrals.codes.fields.referrerPlaceholder")}
                value={clientSearch.searchTerm}
                onChange={(e) => clientSearch.handleChange(e.target.value)}
                onFocus={() => {
                  if (clientSearch.results.length > 0) clientSearch.setShowDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => clientSearch.setShowDropdown(false), 200);
                }}
                className="text-base"
              />
              {clientSearch.isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Skeleton className="h-4 w-10" />
                </div>
              )}
            </div>

            {clientSearch.showDropdown && clientSearch.results.length > 0 && (
              <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg max-h-60 overflow-y-auto">
                {clientSearch.results.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                    onClick={() => selectClient(client)}
                  >
                    <div className="font-medium text-sm">
                      {client.first_name} {client.last_name}
                    </div>
                    <div className="text-xs text-gray-500">{client.email}</div>
                  </button>
                ))}
              </div>
            )}

            {clientSearch.showDropdown &&
              clientSearch.results.length === 0 &&
              clientSearch.searchTerm.trim().length >= 2 &&
              !clientSearch.isSearching && (
                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg p-4 text-center text-gray-500 text-sm">
                  {t("referrals.codes.noClientsFound")}
                </div>
              )}

            {referrerClientId && (
              <div className="text-xs text-muted-foreground">
                {t("referrals.codes.fields.referrerSelected", { id: referrerClientId })}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-gray-100 p-4 mt-auto">
          <div className="flex w-full justify-end">
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={!canSave}
            >
              {isSaving ? (
                <Skeleton className="h-4 w-16" />
              ) : isEdit ? (
                t("referrals.codes.actions.save")
              ) : (
                t("referrals.codes.actions.create")
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

