"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  createInvitation,
  loadInviteRoleOptions,
  lookupPendingInvitation,
} from "@/lib/api/invitation/invitation";
import {
  defaultInviteRoleId,
  inviteRolesForScope,
  type InviteRoleOption,
  type InviteScope,
} from "@/lib/auth/invite-roles";
import { PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permission-keys";
import { useCompanyId, useLocationId } from "@/lib/company-util";
import { useAuth } from "@/providers/auth-provider";

export type InvitableStaff = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  user_id?: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN_ROLES = new Set(["owner", "admin", "manager", "stylist", "staff", "freelancer"]);

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
  const { hasPermission, hasCompanyPermission, locations } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, setPending] = useState<boolean | null>(null);
  const [scope, setScope] = useState<InviteScope>("location");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(locationId);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [roleOptions, setRoleOptions] = useState<InviteRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesFailed, setRolesFailed] = useState(false);

  const companyLocations = useMemo(
    () => locations.filter((location) => location.company_id === companyId && location.is_active),
    [locations, companyId],
  );

  useEffect(() => {
    if (!open) return;
    setInviteLink(null);
    setSubmitting(false);
    setScope("location");
    setSelectedLocationId(locationId);
    setRoleId(null);
  }, [open, staff?.id, locationId]);

  useEffect(() => {
    if (!open || selectedLocationId) return;
    setSelectedLocationId(companyLocations[0]?.id ?? null);
  }, [open, selectedLocationId, companyLocations]);

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setRolesLoading(true);
    setRolesFailed(false);
    void loadInviteRoleOptions(companyId)
      .then((options) => {
        if (cancelled) return;
        setRoleOptions(options);
        setRolesLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRoleOptions([]);
        setRolesFailed(true);
        setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const locationCaller = useMemo(
    () =>
      new Set<string>(
        PERMISSION_KEYS.filter(
          (key) => selectedLocationId && hasPermission(key as PermissionKey, selectedLocationId),
        ),
      ),
    [hasPermission, selectedLocationId],
  );
  const companyCaller = useMemo(
    () =>
      new Set<string>(
        PERMISSION_KEYS.filter((key) => companyId && hasCompanyPermission(key as PermissionKey, companyId)),
      ),
    [companyId, hasCompanyPermission],
  );
  const locationRoles = useMemo(
    () => inviteRolesForScope(roleOptions, "location", locationCaller),
    [locationCaller, roleOptions],
  );
  const companyRoles = useMemo(
    () => inviteRolesForScope(roleOptions, "company", companyCaller),
    [companyCaller, roleOptions],
  );
  const visibleRoles = scope === "company" ? companyRoles : locationRoles;

  useEffect(() => {
    if (rolesLoading) return;
    if (scope === "company" && companyRoles.length === 0 && locationRoles.length > 0) {
      setScope("location");
    } else if (scope === "location" && locationRoles.length === 0 && companyRoles.length > 0) {
      setScope("company");
    }
  }, [companyRoles.length, locationRoles.length, rolesLoading, scope]);

  useEffect(() => {
    if (visibleRoles.some((role) => role.id === roleId)) return;
    setRoleId(defaultInviteRoleId(visibleRoles));
  }, [roleId, visibleRoles]);

  useEffect(() => {
    if (!open) return;
    setPending(null);
    if (!staff || staff.user_id || !companyId) return;
    if (scope === "location" && !selectedLocationId) {
      setPending(false);
      return;
    }

    let cancelled = false;
    void lookupPendingInvitation({
      companyId,
      staffId: staff.id,
      locationId: scope === "company" ? null : selectedLocationId,
      scope,
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
  }, [open, staff, companyId, scope, selectedLocationId]);

  if (!staff) return null;

  const name = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || staff.email;
  const email = staff.email.trim();
  const emailValid = EMAIL.test(email);
  const checking = pending === null && !staff.user_id;
  const isResend = pending === true;
  const showScopeChoice = locationRoles.length > 0 && companyRoles.length > 0;
  const roleLabel = (roleName: string) =>
    KNOWN_ROLES.has(roleName) ? t(`staff.invite.roles.${roleName}`) : roleName;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId || !emailValid || staff.user_id || !roleId) return;
    if (scope === "location" && !selectedLocationId) return;
    setSubmitting(true);
    try {
      const result = await createInvitation({
        companyId,
        staffId: staff.id,
        locationId: scope === "company" ? null : selectedLocationId,
        locale,
        roleId,
        scope,
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
          ? t(isResend ? "staff.invite.resent" : "staff.invite.sent")
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
            <p className="text-sm text-muted-foreground">{t("staff.invite.existingAccountNote")}</p>
            {!emailValid && (
              <p className="text-sm text-destructive">{t("staff.invite.errors.invalidEmail")}</p>
            )}
            {showScopeChoice && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("staff.invite.scope")}</p>
                <RadioGroup
                  value={scope}
                  onValueChange={(value) => setScope(value as InviteScope)}
                  className="gap-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="location" id="invite-scope-location" />
                    <Label htmlFor="invite-scope-location">{t("staff.invite.scopeLocation")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="company" id="invite-scope-company" />
                    <Label htmlFor="invite-scope-company">{t("staff.invite.scopeCompany")}</Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  {t(scope === "company" ? "staff.invite.scopeCompanyHelp" : "staff.invite.scopeLocationHelp")}
                </p>
              </div>
            )}
            {scope === "location" && companyLocations.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="invite-location">{t("staff.invite.location")}</Label>
                <Select
                  value={selectedLocationId ?? undefined}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger id="invite-location" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companyLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="invite-role">{t("staff.invite.role")}</Label>
              <Select
                value={roleId ?? undefined}
                onValueChange={setRoleId}
                disabled={rolesLoading || visibleRoles.length === 0}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue placeholder={rolesLoading ? t("staff.invite.checking") : undefined} />
                </SelectTrigger>
                <SelectContent>
                  {visibleRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {roleLabel(role.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!rolesLoading && (rolesFailed || visibleRoles.length === 0) && (
                <p className="text-sm text-destructive">{t("staff.invite.noGrantableRole")}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  checking ||
                  rolesLoading ||
                  !emailValid ||
                  !companyId ||
                  !roleId ||
                  (scope === "location" && !selectedLocationId)
                }
              >
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
