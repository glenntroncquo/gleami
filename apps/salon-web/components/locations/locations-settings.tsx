"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RiAddLine, RiLoader4Line, RiMapPinLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/auth-provider";
import {
  asLocationClient,
  canCreateAnotherLocation,
  createLocation,
  DEFAULT_LOCATION_TIMEZONE,
  fetchCompanyLocations,
  setCompanyMultiLocationEnabled,
  setLocationActive,
  updateLocation,
  type LocationRecord,
  type LocationWrite,
} from "@/lib/location";
import { createClient } from "@/lib/supabase/client";

type LocationForm = {
  name: string;
  street: string;
  postal_code: string;
  city: string;
  state: string;
  country: string;
  email: string;
  timezone: string;
};

const emptyForm: LocationForm = {
  name: "",
  street: "",
  postal_code: "",
  city: "",
  state: "",
  country: "",
  email: "",
  timezone: DEFAULT_LOCATION_TIMEZONE,
};

function toWrite(form: LocationForm, isActive = true): LocationWrite {
  return {
    name: form.name,
    street: form.street || null,
    postal_code: form.postal_code || null,
    city: form.city || null,
    state: form.state || null,
    country: form.country || null,
    email: form.email || null,
    timezone: form.timezone || DEFAULT_LOCATION_TIMEZONE,
    is_active: isActive,
  };
}

function fromRecord(row: LocationRecord): LocationForm {
  return {
    name: row.name ?? "",
    street: row.street ?? "",
    postal_code: row.postal_code ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    country: row.country ?? "",
    email: row.email ?? "",
    timezone: row.timezone || DEFAULT_LOCATION_TIMEZONE,
  };
}

export function LocationsSettings() {
  const t = useTranslations("settings.locations");
  const {
    companyId,
    multiLocationEnabled,
    multiLocationFlagPresent,
    hasCompanyPermission,
    refreshMemberships,
  } = useAuth();
  const supabase = useMemo(() => asLocationClient(createClient()), []);

  const [rows, setRows] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFlag, setSavingFlag] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRecord | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const canManage =
    hasCompanyPermission("locations:manage") ||
    hasCompanyPermission("settings:manage");
  const activeCount = rows.filter((row) => row.is_active).length;
  const allowCreate = canCreateAnotherLocation({
    multiLocationEnabled,
    activeCount,
  });

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const next = await fetchCompanyLocations(supabase, companyId);
    setRows(next);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: LocationRecord) => {
    setEditing(row);
    setForm(fromRecord(row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    if (!editing && !allowCreate) {
      toast.error(t("flagRequiredToCreate"));
      return;
    }

    setSaving(true);
    const result = editing
      ? await updateLocation(supabase, editing.id, toWrite(form, editing.is_active))
      : await createLocation(supabase, companyId, toWrite(form, true));
    setSaving(false);

    if (result.error || !result.data) {
      toast.error(t("saveFailed"));
      return;
    }

    toast.success(editing ? t("updated") : t("created"));
    setDialogOpen(false);
    await load();
    await refreshMemberships();
  };

  const handleToggleActive = async (row: LocationRecord) => {
    if (row.is_active && activeCount <= 1) {
      toast.error(t("cannotDeactivateLast"));
      return;
    }
    const { error } = await setLocationActive(supabase, row.id, !row.is_active);
    if (error) {
      toast.error(t("saveFailed"));
      return;
    }
    toast.success(row.is_active ? t("deactivated") : t("reactivated"));
    await load();
    await refreshMemberships();
  };

  const handleFlagChange = async (enabled: boolean) => {
    if (!companyId) return;
    setSavingFlag(true);
    const result = await setCompanyMultiLocationEnabled(supabase, companyId, enabled);
    setSavingFlag(false);
    if (result.error) {
      toast.error(
        result.columnPresent ? t("saveFailed") : t("flagColumnMissing"),
      );
      return;
    }
    toast.success(enabled ? t("flagEnabled") : t("flagDisabled"));
    await refreshMemberships();
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("flagTitle")}</p>
          <p className="text-muted-foreground text-sm">{t("flagHint")}</p>
          {!multiLocationFlagPresent && (
            <p className="text-muted-foreground text-xs">{t("flagColumnMissing")}</p>
          )}
        </div>
        <Switch
          checked={multiLocationEnabled}
          disabled={savingFlag || !multiLocationFlagPresent}
          onCheckedChange={handleFlagChange}
          aria-label={t("flagTitle")}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("listHint")}</p>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          disabled={!allowCreate}
        >
          <RiAddLine size={16} className="mr-1.5" />
          {t("create")}
        </Button>
      </div>
      {!allowCreate && (
        <p className="text-muted-foreground text-xs">{t("flagRequiredToCreate")}</p>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="flex gap-3">
                <RiMapPinLine className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {row.name}
                    {row.is_primary && (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {t("primary")}
                      </span>
                    )}
                    {!row.is_active && (
                      <span className="text-muted-foreground ml-2 text-xs font-normal">
                        {t("inactive")}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {[row.street, row.postal_code, row.city, row.country]
                      .filter(Boolean)
                      .join(", ") || t("noAddress")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(row)}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleToggleActive(row)}
                >
                  {row.is_active ? t("deactivate") : t("reactivate")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("editTitle") : t("createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field label={t("name")}>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t("namePlaceholder")}
              />
            </Field>
            <Field label={t("street")}>
              <Input
                value={form.street}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, street: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("postalCode")}>
                <Input
                  value={form.postal_code}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      postal_code: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label={t("city")}>
                <Input
                  value={form.city}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("state")}>
                <Input
                  value={form.state}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, state: event.target.value }))
                  }
                />
              </Field>
              <Field label={t("country")}>
                <Input
                  value={form.country}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, country: event.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label={t("timezone")}>
              <Input
                value={form.timezone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, timezone: event.target.value }))
                }
                placeholder={DEFAULT_LOCATION_TIMEZONE}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving && (
                <RiLoader4Line size={16} className="mr-1.5 animate-spin" />
              )}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
