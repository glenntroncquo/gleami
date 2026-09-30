"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createInvitation, lookupPendingInvitation } from "@/lib/api/invitation/invitation";
import { useCompanyId, useLocationId } from "@/lib/company-util";

export type InvitableStaff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  user_id?: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteExistingStaffDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: InvitableStaff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const companyId = useCompanyId();
  const locationId = useLocationId();
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, setPending] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setInviteLink(null);
    setSubmitting(false);
    setPending(null);
    if (!staff || staff.user_id || !companyId) return;

    let cancelled = false;
    void lookupPendingInvitation({
      companyId,
      staffId: staff.id,
      locationId,
    })
      .then((result) => {
        if (!cancelled) setPending(result.success && result.pending === true);
      })
      .catch(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, staff, companyId, locationId]);

  if (!staff) return null;

  const name = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.email;
  const email = staff.email.trim();
  const emailValid = EMAIL.test(email);
  const checking = pending === null && !staff.user_id;
  const isResend = pending === true;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !emailValid || staff.user_id) return;
    setSubmitting(true);
    try {
      const result = await createInvitation({
        companyId,
        staffId: staff.id,
        locationId,
        locale,
      });
      if (!result.success || !result.path || !result.token) {
        const key = result.error ?? "invitation_invalid";
        toast.error(t(`staff.invite.errors.${errorKey(key)}`));
        return;
      }
      const link = `${window.location.origin}${result.path}`;
      setInviteLink(link);
      toast.success(
        result.emailSent
          ? t(pending ? "staff.invite.resent" : "staff.invite.sent")
          : t("staff.invite.sentWithoutEmail"),
      );
    } catch {
      toast.error(t("staff.invite.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {checking
              ? t("staff.invite.checking")
              : t(isResend ? "staff.invite.titleResend" : "staff.invite.title", { name })}
          </DialogTitle>
          <DialogDescription>
            {checking
              ? t("staff.invite.checkingDescription")
              : t(isResend ? "staff.invite.descriptionResend" : "staff.invite.description", { name })}
          </DialogDescription>
        </DialogHeader>
        {staff.user_id ? (
          <p className="text-sm text-muted-foreground">{t("staff.invite.errors.alreadyHasLogin")}</p>
        ) : inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("staff.invite.linkHelp")}</p>
            <Input readOnly value={inviteLink} />
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                  toast.success(t("staff.invite.linkCopied"));
                }}
              >
                {t("staff.invite.copyLink")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("staff.invite.email")}</p>
              <p className="text-sm text-muted-foreground">{email || t("common.notAvailable")}</p>
            </div>
            {!emailValid && (
              <p className="text-sm text-destructive">{t("staff.invite.errors.invalidEmail")}</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting || checking || !emailValid || !companyId}>
                {submitting
                  ? t(isResend ? "staff.invite.resending" : "staff.invite.sending")
                  : checking
                    ? t("staff.invite.checking")
                    : t(isResend ? "staff.invite.resend" : "staff.invite.send")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function errorKey(code: string): string {
  switch (code) {
    case "invitation_forbidden":
      return "forbidden";
    case "invitation_role_scope":
      return "roleScope";
    case "invitation_not_grantable":
      return "notGrantable";
    case "invitation_duplicate":
      return "duplicate";
    case "invitation_invalid_email":
      return "invalidEmail";
    case "invitation_already_has_login":
      return "alreadyHasLogin";
    case "invitation_no_location":
      return "noLocation";
    case "invitation_staff_not_found":
      return "notFound";
    default:
      return "generic";
  }
}
