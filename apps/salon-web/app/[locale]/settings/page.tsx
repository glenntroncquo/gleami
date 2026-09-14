"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  RiBuildingLine,
  RiMapPinLine,
  RiPaletteLine,
  RiLayoutLine,
  RiPlugLine,
  RiSunLine,
  RiMoonClearLine,
  RiComputerLine,
  RiImageAddLine,
  RiLoader4Line,
} from "@remixicon/react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import { useLocaleNavigation } from "@/hooks/use-locale-navigation";
import { locales, type Locale } from "@/i18n/config";
import { setCookie } from "cookies-next";
import { BookingWidgetSettings } from "@/components/booking-widget/booking-widget-settings";
import { IntegrationsSettings } from "@/components/integrations/integrations-settings";
import { LocationsSettings } from "@/components/locations/locations-settings";
import { useAuth } from "@/providers/auth-provider";
import {
  PAGE_FETCH_TIMEOUT_MS,
  startFailClosedLoad,
  withTimeout,
} from "@/lib/async/fail-closed";

type SectionId =
  | "general"
  | "company"
  | "locations"
  | "appearance"
  | "booking"
  | "integrations";

type CompanyForm = {
  name: string;
  email: string;
  description: string;
  street: string;
  city: string;
  postal_code: string;
  state: string;
  country: string;
  image_url: string | null;
  slug: string;
};

const emptyForm: CompanyForm = {
  name: "",
  slug: "",
  email: "",
  description: "",
  street: "",
  city: "",
  postal_code: "",
  state: "",
  country: "",
  image_url: null,
};

const languageNames: Record<Locale, string> = {
  en: "English",
  nl: "Nederlands",
  fr: "Français",
  pt: "Português",
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const companyId = useCompanyId();
  const { hasCompanyPermission, membershipReady } = useAuth();
  const canManageLocations =
    !membershipReady ||
    hasCompanyPermission("locations:manage") ||
    hasCompanyPermission("settings:manage");
  const supabase = useMemo(() => createClient(), []);
  const { theme, setTheme } = useTheme();
  const { currentLocale, switchLocale } = useLocaleNavigation();

  const [active, setActive] = useState<SectionId>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<CompanyForm>(emptyForm);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!companyId) {
      if (membershipReady) {
        setLoading(false);
        return;
      }
      const timer = setTimeout(() => setLoading(false), PAGE_FETCH_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }

    setLoading(true);
    return startFailClosedLoad(
      setLoading,
      async (isCancelled) => {
        const { data, error } = await withTimeout(
          supabase
            .from("company")
            .select(
              "name, slug, email, description, street, city, postal_code, state, country, image_url"
            )
            .eq("id", companyId)
            .single(),
          PAGE_FETCH_TIMEOUT_MS,
          "company settings",
        );

        if (isCancelled()) return;

        if (error || !data) {
          toast.error(t("loadFailed"));
          return;
        }

        setForm({
          name: data.name ?? "",
          slug: data.slug ?? "",
          email: data.email ?? "",
          description: data.description ?? "",
          street: data.street ?? "",
          city: data.city ?? "",
          postal_code: data.postal_code ?? "",
          state: data.state ?? "",
          country: data.country ?? "",
          image_url: data.image_url ?? null,
        });
      },
      { label: "settings" },
    );
  }, [companyId, membershipReady, supabase, t]);

  const updateField = <K extends keyof CompanyForm>(
    key: K,
    value: CompanyForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    if (!companyId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${companyId}/branding/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("company").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      updateField("image_url", publicUrl);
      toast.success(t("saved"));

      await supabase
        .from("company")
        .update({ image_url: publicUrl })
        .eq("id", companyId);
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast.error(t("saveFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    const { error } = await supabase
      .from("company")
      .update({
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        email: form.email.trim() || null,
        description: form.description.trim() || null,
        street: form.street.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
      })
      .eq("id", companyId);

    setSaving(false);

    if (error) {
      console.error("Error saving settings:", error);
      if (error.code === "23505") {
        toast.error(t("general.slugTaken"));
      } else {
        toast.error(t("saveFailed"));
      }
      return;
    }
    toast.success(t("saved"));
  };

  const handleLanguageChange = (next: Locale) => {
    setCookie("locale", next, { maxAge: 60 * 60 * 24 * 365, path: "/" });
    switchLocale(next);
  };

  const sections: { id: SectionId; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: t("nav.general"), icon: <RiBuildingLine size={18} /> },
    { id: "company", label: t("nav.company"), icon: <RiMapPinLine size={18} /> },
    ...(canManageLocations
      ? [
          {
            id: "locations" as const,
            label: t("nav.locations"),
            icon: <RiMapPinLine size={18} />,
          },
        ]
      : []),
    {
      id: "appearance",
      label: t("nav.appearance"),
      icon: <RiPaletteLine size={18} />,
    },
    {
      id: "booking",
      label: t("nav.booking"),
      icon: <RiLayoutLine size={18} />,
    },
    {
      id: "integrations",
      label: t("nav.integrations"),
      icon: <RiPlugLine size={18} />,
    },
  ];

  const themeOptions = [
    { value: "light", label: t("appearance.light"), icon: <RiSunLine size={16} /> },
    { value: "dark", label: t("appearance.dark"), icon: <RiMoonClearLine size={16} /> },
    {
      value: "system",
      label: t("appearance.system"),
      icon: <RiComputerLine size={16} />,
    },
  ];

  return (
    <ProtectedRoute>
      <AppSidebar />
      <SidebarInset>
        <div
          className={cn(
            "flex w-full flex-1 flex-col gap-8 p-6 lg:p-10",
            active === "booking" ? "max-w-6xl" : "max-w-5xl"
          )}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            {/* Section nav */}
            <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active === section.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <span className="text-muted-foreground/80">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>

            {/* Content */}
            <div className="flex-1">
              {loading ? (
                <SettingsSkeleton />
              ) : (
                <div className="space-y-8">
                  {active === "general" && (
                    <SettingsSection
                      title={t("general.title")}
                      description={t("general.description")}
                    >
                      <div className="space-y-2">
                        <Label>{t("general.logo")}</Label>
                        <div className="flex items-center gap-4">
                          <div className="bg-muted flex size-16 items-center justify-center overflow-hidden rounded-xl border">
                            {form.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={form.image_url}
                                alt={form.name || "logo"}
                                className="size-full object-cover"
                              />
                            ) : (
                              <RiImageAddLine
                                size={22}
                                className="text-muted-foreground/70"
                              />
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="inline-flex">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleLogoUpload(file);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploading}
                                asChild
                              >
                                <span className="cursor-pointer">
                                  {uploading ? (
                                    <RiLoader4Line
                                      size={16}
                                      className="mr-1.5 animate-spin"
                                    />
                                  ) : (
                                    <RiImageAddLine size={16} className="mr-1.5" />
                                  )}
                                  {t("general.uploadLogo")}
                                </span>
                              </Button>
                            </label>
                            <p className="text-muted-foreground text-xs">
                              {t("general.logoHint")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <Field label={t("general.companyName")}>
                        <Input
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          placeholder={t("general.companyNamePlaceholder")}
                        />
                      </Field>

                      <Field
                        label={t("general.slug")}
                        hint={t("general.slugHint")}
                      >
                        <Input
                          value={form.slug}
                          onChange={(e) => updateField("slug", e.target.value)}
                          placeholder={t("general.slugPlaceholder")}
                        />
                      </Field>

                      <Field label={t("general.email")}>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder={t("general.emailPlaceholder")}
                        />
                      </Field>

                      <Field label={t("general.descriptionLabel")}>
                        <Textarea
                          value={form.description}
                          onChange={(e) =>
                            updateField("description", e.target.value)
                          }
                          placeholder={t("general.descriptionPlaceholder")}
                          rows={4}
                        />
                      </Field>
                    </SettingsSection>
                  )}

                  {active === "company" && (
                    <SettingsSection
                      title={t("company.title")}
                      description={t("company.description")}
                    >
                      <Field label={t("company.street")}>
                        <Input
                          value={form.street}
                          onChange={(e) => updateField("street", e.target.value)}
                          placeholder={t("company.streetPlaceholder")}
                        />
                      </Field>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label={t("company.postalCode")}>
                          <Input
                            value={form.postal_code}
                            onChange={(e) =>
                              updateField("postal_code", e.target.value)
                            }
                            placeholder={t("company.postalCodePlaceholder")}
                          />
                        </Field>
                        <Field label={t("company.city")}>
                          <Input
                            value={form.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            placeholder={t("company.cityPlaceholder")}
                          />
                        </Field>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label={t("company.state")}>
                          <Input
                            value={form.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            placeholder={t("company.statePlaceholder")}
                          />
                        </Field>
                        <Field label={t("company.country")}>
                          <Input
                            value={form.country}
                            onChange={(e) =>
                              updateField("country", e.target.value)
                            }
                            placeholder={t("company.countryPlaceholder")}
                          />
                        </Field>
                      </div>
                    </SettingsSection>
                  )}

                  {active === "locations" && (
                    <SettingsSection
                      title={t("locations.title")}
                      description={t("locations.description")}
                    >
                      <LocationsSettings />
                    </SettingsSection>
                  )}

                  {active === "appearance" && (
                    <SettingsSection
                      title={t("appearance.title")}
                      description={t("appearance.description")}
                    >
                      <Row
                        title={t("appearance.theme")}
                        hint={t("appearance.themeHint")}
                      >
                        <Select
                          value={mounted ? theme : undefined}
                          onValueChange={setTheme}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {themeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  {opt.icon}
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>

                      <Separator />

                      <Row
                        title={t("appearance.language")}
                        hint={t("appearance.languageHint")}
                      >
                        <Select
                          value={currentLocale}
                          onValueChange={(v) =>
                            handleLanguageChange(v as Locale)
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {locales.map((loc) => (
                              <SelectItem key={loc} value={loc}>
                                {languageNames[loc]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Row>
                    </SettingsSection>
                  )}

                  {active === "booking" && (
                    <SettingsSection
                      title={t("booking.title")}
                      description={t("booking.description")}
                    >
                      <BookingWidgetSettings />
                    </SettingsSection>
                  )}

                  {active === "integrations" && (
                    <SettingsSection
                      title={t("integrations.title")}
                      description={t("integrations.description")}
                    >
                      <IntegrationsSettings />
                    </SettingsSection>
                  )}

                  {active !== "appearance" &&
                    active !== "booking" &&
                    active !== "integrations" &&
                    active !== "locations" && (
                      <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                          {saving && (
                            <RiLoader4Line
                              size={16}
                              className="mr-1.5 animate-spin"
                            />
                          )}
                          {saving ? t("saving") : t("save")}
                        </Button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </ProtectedRoute>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="border-b px-6 py-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="space-y-5 px-6 py-6">{children}</div>
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

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="bg-card space-y-5 rounded-xl border p-6 shadow-sm">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
