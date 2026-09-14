"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";

import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getScradaIntegration,
  saveScradaIntegration,
  type ScradaPaymentMethodMap,
} from "@/lib/integrations/scrada/actions";
import { saveTimeTreeIntegration } from "@/lib/integrations/timetree/actions";

const TIMETREE_INTEGRATION_TYPE = "timetree";
const SCRADA_LANGUAGES = ["NL", "FR", "EN", "PT"] as const;
const PAYMENT_METHOD_KEYS: (keyof ScradaPaymentMethodMap)[] = [
  "cash",
  "card",
  "bank_transfer",
  "invoice",
];

export function IntegrationsSettings() {
  return (
    <div className="space-y-8">
      <ScradaSettings />
      <Separator />
      <TimeTreeSettings />
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

const emptyScradaForm = {
  active: false,
  externalCompanyId: "",
  apiKey: "",
  apiPassword: "",
  hasApiKey: false,
  hasApiPassword: false,
  language: "NL",
  journalId: "",
  categoryId: "",
  vatTypeId: "",
  vatPercentage: "",
  paymentMethodMap: {
    cash: "",
    card: "",
    bank_transfer: "",
    invoice: "",
  } as ScradaPaymentMethodMap,
};

function ScradaSettings() {
  const t = useTranslations("settings");
  const tPos = useTranslations("pos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyScradaForm);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const result = await getScradaIntegration();
      if (cancelled) return;

      if (!result.success) {
        toast.error(t("loadFailed"));
        setLoading(false);
        return;
      }

      setForm({
        active: result.data.active,
        externalCompanyId: result.data.externalCompanyId,
        apiKey: "",
        apiPassword: "",
        hasApiKey: result.data.hasApiKey,
        hasApiPassword: result.data.hasApiPassword,
        language: result.data.language,
        journalId: result.data.journalId,
        categoryId: result.data.categoryId,
        vatTypeId: result.data.vatTypeId,
        vatPercentage: result.data.vatPercentage,
        paymentMethodMap: result.data.paymentMethodMap,
      });
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveScradaIntegration({
      active: form.active,
      externalCompanyId: form.externalCompanyId,
      apiKey: form.apiKey,
      apiPassword: form.apiPassword,
      language: form.language,
      journalId: form.journalId,
      categoryId: form.categoryId,
      vatTypeId: form.vatTypeId,
      vatPercentage: form.vatPercentage,
      paymentMethodMap: form.paymentMethodMap,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(t("saveFailed"));
      return;
    }

    toast.success(t("saved"));
    setForm((prev) => ({
      ...prev,
      apiKey: "",
      apiPassword: "",
      hasApiKey: prev.hasApiKey || Boolean(prev.apiKey.trim()),
      hasApiPassword: prev.hasApiPassword || Boolean(prev.apiPassword.trim()),
    }));
  };

  if (loading) {
    return (
      <IntegrationCard
        title={t("integrations.scrada.title")}
        description={t("integrations.scrada.description")}
      >
        <div className="flex h-32 items-center justify-center">
          <RiLoader4Line size={22} className="text-muted-foreground animate-spin" />
        </div>
      </IntegrationCard>
    );
  }

  return (
    <IntegrationCard
      title={t("integrations.scrada.title")}
      description={t("integrations.scrada.description")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t("integrations.scrada.enabled")}</p>
        </div>
        <Switch
          checked={form.active}
          onCheckedChange={(checked) =>
            setForm((prev) => ({ ...prev, active: checked }))
          }
        />
      </div>

      <Separator />

      <Field label={t("integrations.scrada.externalCompanyId")}>
        <Input
          value={form.externalCompanyId}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, externalCompanyId: e.target.value }))
          }
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label={t("integrations.scrada.apiKey")}
          hint={
            form.hasApiKey
              ? t("integrations.scrada.credentialSet")
              : t("integrations.scrada.credentialNotSet")
          }
        >
          <Input
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, apiKey: e.target.value }))
            }
            placeholder={t("integrations.scrada.credentialPlaceholder")}
          />
        </Field>
        <Field
          label={t("integrations.scrada.apiPassword")}
          hint={
            form.hasApiPassword
              ? t("integrations.scrada.credentialSet")
              : t("integrations.scrada.credentialNotSet")
          }
        >
          <Input
            type="password"
            autoComplete="off"
            value={form.apiPassword}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, apiPassword: e.target.value }))
            }
            placeholder={t("integrations.scrada.credentialPlaceholder")}
          />
        </Field>
      </div>

      <Field label={t("integrations.scrada.language")}>
        <Select
          value={form.language}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, language: value }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCRADA_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("integrations.scrada.journalId")}>
          <Input
            value={form.journalId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, journalId: e.target.value }))
            }
          />
        </Field>
        <Field label={t("integrations.scrada.categoryId")}>
          <Input
            value={form.categoryId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, categoryId: e.target.value }))
            }
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("integrations.scrada.vatTypeId")}>
          <Input
            value={form.vatTypeId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vatTypeId: e.target.value }))
            }
          />
        </Field>
        <Field label={t("integrations.scrada.vatPercentage")}>
          <Input
            type="number"
            step="0.01"
            value={form.vatPercentage}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vatPercentage: e.target.value }))
            }
          />
        </Field>
      </div>

      <Separator />

      <div className="space-y-1">
        <Label>{t("integrations.scrada.paymentMethodMapping")}</Label>
        <p className="text-muted-foreground text-xs">
          {t("integrations.scrada.paymentMethodMappingHint")}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {PAYMENT_METHOD_KEYS.map((key) => (
          <Field
            key={key}
            label={tPos(
              `paymentMethods.${key === "bank_transfer" ? "bankTransfer" : key}`
            )}
          >
            <Input
              value={form.paymentMethodMap[key]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  paymentMethodMap: {
                    ...prev.paymentMethodMap,
                    [key]: e.target.value,
                  },
                }))
              }
            />
          </Field>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <RiLoader4Line size={16} className="mr-1.5 animate-spin" />}
          {saving ? t("saving") : t("integrations.scrada.saveScrada")}
        </Button>
      </div>
    </IntegrationCard>
  );
}

function TimeTreeSettings() {
  const t = useTranslations("settings");
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [calendarId, setCalendarId] = useState("");

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("company_integrations")
        .select("config, active")
        .eq("company_id", companyId)
        .eq("integration_type", TIMETREE_INTEGRATION_TYPE)
        .maybeSingle();

      if (cancelled) return;

      const config = (data?.config as Record<string, unknown> | null) ?? {};
      setActive(data?.active ?? false);
      setCalendarId((config.calendar_id as string | undefined) ?? "");
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveTimeTreeIntegration({ calendarId, active });
    setSaving(false);

    if (!result.success) {
      toast.error(t("saveFailed"));
      return;
    }
    toast.success(t("saved"));
  };

  if (!companyId || loading) {
    return (
      <IntegrationCard
        title={t("integrations.timetree.title")}
        description={t("integrations.timetree.description")}
      >
        <div className="flex h-24 items-center justify-center">
          <RiLoader4Line size={22} className="text-muted-foreground animate-spin" />
        </div>
      </IntegrationCard>
    );
  }

  return (
    <IntegrationCard
      title={t("integrations.timetree.title")}
      description={t("integrations.timetree.description")}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t("integrations.timetree.enabled")}</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      <Separator />

      <Field label={t("integrations.timetree.calendarId")}>
        <Input
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder={t("integrations.timetree.calendarIdPlaceholder")}
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <RiLoader4Line size={16} className="mr-1.5 animate-spin" />}
          {saving ? t("saving") : t("integrations.timetree.saveTimeTree")}
        </Button>
      </div>
    </IntegrationCard>
  );
}
