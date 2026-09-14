"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  DEFAULT_WIDGET_THEME,
  WIDGET_THEME_EVENT,
  buildWidgetUrl,
  getWidgetDomain,
  isWidgetReadyMessage,
} from "@/lib/widget";

export interface SalonBookingProps {
  companyId: string;
  widgetDomain?: string;
  preselectedStaffIds?: string[];
  preselectedStaffSlugs?: string[];
  preselectedServiceIds?: string[];
  preselectedServiceVariantIds?: string[];
}

export function SalonBooking({
  companyId,
  widgetDomain = getWidgetDomain(),
  preselectedStaffIds = [],
  preselectedStaffSlugs = [],
  preselectedServiceIds = [],
  preselectedServiceVariantIds = [],
}: SalonBookingProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const widgetUrl = buildWidgetUrl(widgetDomain, {
    companyId,
    staffIds: preselectedStaffIds,
    staffSlugs: preselectedStaffSlugs,
    serviceIds: preselectedServiceIds,
    serviceVariantIds: preselectedServiceVariantIds,
  });

  const sendTheme = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: WIDGET_THEME_EVENT, theme: DEFAULT_WIDGET_THEME },
      "*",
    );
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (isWidgetReadyMessage(event.data)) {
        sendTheme();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendTheme]);

  return (
    <iframe
      ref={iframeRef}
      id="salonify-widget"
      src={widgetUrl}
      title="Book appointment"
      onLoad={() => setTimeout(sendTheme, 300)}
      allow="clipboard-read; clipboard-write"
    />
  );
}
