"use client";

import { useEffect, useState } from "react";
import { RiLoader4Line } from "@remixicon/react";

import { createClient } from "@/lib/supabase/client";
import { useCompanyId } from "@/lib/company-util";
import {
  sanitizeTheme,
  DEFAULT_WIDGET_THEME,
  type WidgetTheme,
} from "@/lib/booking-widget/theme";
import { saveWidgetTheme } from "@/lib/booking-widget/actions";
import { WidgetThemeEditor } from "./widget-theme-editor";

export function BookingWidgetSettings() {
  const companyId = useCompanyId();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<WidgetTheme>(DEFAULT_WIDGET_THEME);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("company_integrations")
        .select("config")
        .eq("company_id", companyId)
        .eq("integration_type", "booking")
        .maybeSingle();

      if (cancelled) return;

      const styles =
        data?.config && typeof data.config === "object"
          ? (data.config as Record<string, unknown>).styles
          : undefined;
      setTheme(sanitizeTheme(styles));
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId || loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <RiLoader4Line size={22} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <WidgetThemeEditor
      key={companyId}
      initialTheme={theme}
      preview={{ companyId, supabaseUrl, supabaseKey }}
      onSave={async (next) => saveWidgetTheme(next)}
    />
  );
}
