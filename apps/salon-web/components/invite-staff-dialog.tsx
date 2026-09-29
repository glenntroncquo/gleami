"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERMISSION_KEYS } from "@/lib/auth";
import { roleIsGrantable } from "@/lib/auth/invitation-grant";
import { createInvitation } from "@/lib/api/invitation/invitation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/auth-provider";

type RoleOption = {
  id: string;
  name: string;
  scope: "company" | "location";
  permissions: string[];
};

const ROLE_LABELS = new Set([
  "owner",
  "admin",
  "manager",
  "stylist",
  "staff",
  "freelancer",
]);

export function InviteStaffButton() {
  const t = useTranslations();
  const locale = useLocale();
  const { companyId, hasCompanyPermission, hasPermission, locations } = useAuth();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [scope, setScope] = useState<"company" | "location">("company");
  const [locationId, setLocationId] = useState<string>("");
  const [roleId, setRoleId] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const invitableLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.company_id === companyId &&
          location.is_active &&
          hasPermission("invites:manage", location.id),
      ),
    [locations, companyId, hasPermission],
  );
  const canInviteCompany = companyId
    ? hasCompanyPermission("invites:manage", companyId)
    : false;

  useEffect(() => {
    if (!open) return;
    setScope(canInviteCompany ? "company" : "location");
    setLocationId(invitableLocations[0]?.id ?? "");
    setRoleId("");
    setInviteLink(null);
    // Initialize once per open. Permission helpers change identity with membership refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setLoadingRoles(true);
    const supabase = createClient() as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          or: (filters: string) => PromiseLike<{
            data: { id: string; name: string; scope: string; is_system: boolean; company_id: string | null }[] | null;
            error: { message: string } | null;
          }>;
          in: (column: string, values: string[]) => PromiseLike<{
            data: { role_id: string; permission_key: string }[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
    void (async () => {
      const { data: roleRows, error } = await supabase
        .from("role")
        .select("id, name, scope, is_system, company_id")
        .or(`is_system.eq.true,company_id.eq.${companyId}`);
      if (cancelled) return;
      if (error || !roleRows) {
        setRoles([]);
        setLoadingRoles(false);
        return;
      }
      const ids = roleRows.map((row) => row.id);
      const { data: permissionRows } = await supabase
        .from("role_permission")
        .select("role_id, permission_key")
        .in("role_id", ids);
      if (cancelled) return;
      const byRole = new Map<string, string[]>();
      for (const row of permissionRows ?? []) {
        const list = byRole.get(row.role_id) ?? [];
        list.push(row.permission_key);
        byRole.set(row.role_id, list);
      }
      setRoles(
        roleRows
          .filter((row) => row.scope === "company" || row.scope === "location")
          .map((row) => ({
            id: row.id,
            name: row.name,
            scope: row.scope as "company" | "location",
            permissions: byRole.get(row.id) ?? [],
          })),
      );
      setLoadingRoles(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const callerPermissions = useMemo(() => {
    if (!companyId) return new Set<string>();
    return new Set(
      PERMISSION_KEYS.filter((key) =>
        scope === "company"
          ? hasCompanyPermission(key, companyId)
          : locationId
            ? hasPermission(key, locationId)
            : false,
      ),
    );
  }, [companyId, scope, locationId, hasCompanyPermission, hasPermission]);

  const roleChoices = roles.filter(
    (role) =>
      role.scope === scope && roleIsGrantable(callerPermissions, role.permissions),
  );

  if (!companyId || (!canInviteCompany && invitableLocations.length === 0)) {
    return null;
  }

  const roleLabel = (name: string) =>
    ROLE_LABELS.has(name) ? t(`staff.invite.roles.${name}`) : name;

  const reset = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleId("");
    setInviteLink(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleId || (scope === "location" && !locationId)) return;
    setSubmitting(true);
    try {
      const result = await createInvitation({
        companyId,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleId,
        locationId: scope === "location" ? locationId : null,
        locale,
      });
      if (!result.success || !result.path || !result.token) {
        const key = result.error ?? "invitation_invalid";
        toast.error(t(`staff.invite.errors.${errorKey(key)}`));
        return;
      }
      const link = `${window.location.origin}${result.path}`;
      setInviteLink(link);
      toast.success(result.emailSent ? t("staff.invite.sent") : t("staff.invite.sentWithoutEmail"));
    } catch {
      toast.error(t("staff.invite.errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <UserPlus className="-ms-1 opacity-60" size={16} aria-hidden="true" />
        {t("staff.invite.button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("staff.invite.title")}</DialogTitle>
            <DialogDescription>{t("staff.invite.description")}</DialogDescription>
          </DialogHeader>
          {inviteLink ? (
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="invite-first-name">{t("auth.firstName")}</Label>
                  <Input
                    id="invite-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-last-name">{t("auth.lastName")}</Label>
                  <Input
                    id="invite-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t("auth.email")}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("staff.invite.scope")}</Label>
                <Select
                  value={scope}
                  onValueChange={(value: "company" | "location") => {
                    setScope(value);
                    setRoleId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canInviteCompany && (
                      <SelectItem value="company">{t("staff.invite.scopeCompany")}</SelectItem>
                    )}
                    {invitableLocations.length > 0 && (
                      <SelectItem value="location">{t("staff.invite.scopeLocation")}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {scope === "location" && (
                <div className="space-y-2">
                  <Label>{t("staff.invite.location")}</Label>
                  <Select
                    value={locationId}
                    onValueChange={(value) => {
                      setLocationId(value);
                      setRoleId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("staff.invite.selectLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {invitableLocations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("staff.invite.role")}</Label>
                <Select value={roleId} onValueChange={setRoleId} disabled={loadingRoles}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("staff.invite.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleChoices.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {roleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting || !roleId || loadingRoles}>
                  {submitting ? t("staff.invite.sending") : t("staff.invite.send")}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
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
    default:
      return "generic";
  }
}
