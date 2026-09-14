"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildWidgetUrl,
  getWidgetOrigin,
  type BuildWidgetUrlParams,
} from "@/lib/booking-widget/url";
import type { WidgetTheme } from "@/lib/booking-widget/theme";

type WidgetReadyMessage = {
  type: "salonify-widget-ready";
  source: "salonify-booking-widget";
};

type WidgetHeightMessage = {
  type: "salonify-widget-height";
  height: number;
};

function isReadyMessage(data: unknown): data is WidgetReadyMessage {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { type?: unknown }).type === "salonify-widget-ready"
  );
}

function isHeightMessage(data: unknown): data is WidgetHeightMessage {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { type?: unknown }).type === "salonify-widget-height" &&
    typeof (data as { height?: unknown }).height === "number"
  );
}

export interface WidgetPreviewProps extends BuildWidgetUrlParams {
  /** The theme to push to the widget. Re-sent whenever it changes or the widget reloads. */
  theme: WidgetTheme;
  /**
   * postMessage target origin. Defaults to the widget's real origin in prod.
   * Pass "*" only for local development against a different origin.
   */
  targetOrigin?: string;
  /** Auto-size the iframe to the widget's reported height. Defaults to true. */
  autoHeight?: boolean;
  className?: string;
}

export function WidgetPreview({
  companyId,
  supabaseUrl,
  supabaseKey,
  staffIds,
  theme,
  targetOrigin,
  autoHeight = true,
  className,
}: WidgetPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState<number | null>(null);

  // Keep the latest theme in a ref so the message listener always posts current values.
  const themeRef = useRef<WidgetTheme>(theme);
  themeRef.current = theme;

  const resolvedTargetOrigin = targetOrigin ?? getWidgetOrigin();

  const src = buildWidgetUrl({ companyId, supabaseUrl, supabaseKey, staffIds });

  const postTheme = (nextTheme: WidgetTheme) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: "widget-theme", theme: nextTheme },
      resolvedTargetOrigin
    );
  };

  // Listen for ready + height messages from the widget.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In production the widget posts from its own origin. Accept "*" target
      // (dev) by skipping the origin check only when configured that way.
      if (
        resolvedTargetOrigin !== "*" &&
        event.origin !== resolvedTargetOrigin
      ) {
        return;
      }

      if (isReadyMessage(event.data)) {
        setReady(true);
        // Re-send the current theme on every ready (handles iframe reloads).
        postTheme(themeRef.current);
        if (autoHeight) {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "widget-request-height" },
            resolvedTargetOrigin
          );
        }
        return;
      }

      if (autoHeight && isHeightMessage(event.data)) {
        setHeight(event.data.height);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTargetOrigin, autoHeight]);

  // Push theme updates once the widget is ready.
  useEffect(() => {
    if (ready) postTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, theme]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title="Booking widget preview"
      className={cn("w-full rounded-xl border bg-white", className)}
      style={height ? { height } : undefined}
    />
  );
}
