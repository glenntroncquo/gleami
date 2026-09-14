"use client";

import { WidgetThemeEditor } from "@/components/booking-widget/widget-theme-editor";
import type { WidgetTheme } from "@/lib/booking-widget/theme";
import { saveWidgetThemeForCompany } from "./actions";

interface BookingTestClientProps {
  companyId: string;
  supabaseUrl: string;
  supabaseKey: string;
  initialTheme: WidgetTheme;
  /** Use "*" in local dev where the widget runs on a different origin. */
  targetOrigin?: string;
}

export function BookingTestClient({
  companyId,
  supabaseUrl,
  supabaseKey,
  initialTheme,
  targetOrigin,
}: BookingTestClientProps) {
  return (
    <WidgetThemeEditor
      initialTheme={initialTheme}
      targetOrigin={targetOrigin}
      preview={{ companyId, supabaseUrl, supabaseKey }}
      onSave={async (theme) => saveWidgetThemeForCompany(companyId, theme)}
    />
  );
}
