"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RiLoader4Line, RiRefreshLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WIDGET_THEME,
  WIDGET_THEME_KEYS,
  WIDGET_THEME_TOKENS,
  isValidHexColor,
  normalizeHex,
  sanitizeTheme,
  type WidgetTheme,
  type WidgetThemeKey,
} from "@/lib/booking-widget/theme";
import { WidgetPreview } from "./widget-preview";
import type { BuildWidgetUrlParams } from "@/lib/booking-widget/url";

type SaveResult = { success: true } | { success: false; error: string };

export interface WidgetThemeEditorProps {
  /** Initial theme (already sanitized to a full, valid theme). */
  initialTheme: WidgetTheme;
  /** Persist handler. Receives a full, valid theme. */
  onSave: (theme: WidgetTheme) => Promise<SaveResult>;
  /** Params used to build the preview iframe URL. */
  preview: BuildWidgetUrlParams;
  /** Override the postMessage target origin (e.g. "*" in dev). */
  targetOrigin?: string;
  className?: string;
}

export function WidgetThemeEditor({
  initialTheme,
  onSave,
  preview,
  targetOrigin,
  className,
}: WidgetThemeEditorProps) {
  // Editable string values per token (may be temporarily invalid while typing).
  const [values, setValues] = useState<WidgetTheme>(initialTheme);
  const [saving, setSaving] = useState(false);

  // Debounced theme that is actually pushed to the preview iframe.
  const [previewTheme, setPreviewTheme] = useState<WidgetTheme>(initialTheme);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidKeys = useMemo(
    () => WIDGET_THEME_KEYS.filter((key) => !isValidHexColor(values[key])),
    [values]
  );
  const hasInvalid = invalidKeys.length > 0;

  // Build a fully-valid theme from current values (invalid keys fall back to
  // the current preview theme so the preview never receives invalid colors).
  const validThemeForPreview = useMemo<WidgetTheme>(() => {
    const result = {} as WidgetTheme;
    for (const key of WIDGET_THEME_KEYS) {
      result[key] = isValidHexColor(values[key])
        ? normalizeHex(values[key])
        : previewTheme[key];
    }
    return result;
    // previewTheme intentionally excluded to avoid feedback loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  // Debounce preview updates (~80ms) on any valid change.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewTheme(validThemeForPreview);
    }, 80);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [validThemeForPreview]);

  const setValue = (key: WidgetThemeKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw }));
  };

  const handleReset = () => {
    setValues(DEFAULT_WIDGET_THEME);
    setPreviewTheme(DEFAULT_WIDGET_THEME);
  };

  const handleSave = async () => {
    if (hasInvalid) return;
    setSaving(true);
    try {
      // sanitizeTheme guarantees a full, normalized, valid theme.
      const theme = sanitizeTheme(values);
      const result = await onSave(theme);
      if (result.success) {
        setValues(theme);
        setPreviewTheme(theme);
        toast.success("Booking widget theme saved");
      } else {
        toast.error(result.error || "Could not save theme");
      }
    } catch (err) {
      console.error("Failed to save widget theme:", err);
      toast.error("Could not save theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn("grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", className)}
    >
      {/* Editor */}
      <div className="space-y-5">
        <div className="space-y-4">
          {WIDGET_THEME_TOKENS.map(({ key, label, purpose }) => {
            const value = values[key];
            const valid = isValidHexColor(value);
            const swatch = valid ? normalizeHex(value) : "transparent";
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`color-${key}`} className="font-medium">
                    {label}
                  </Label>
                  <code className="text-muted-foreground text-xs">{key}</code>
                </div>
                <p className="text-muted-foreground text-xs">{purpose}</p>
                <div className="flex items-center gap-2">
                  {/* Live swatch + native picker */}
                  <div className="relative size-9 shrink-0">
                    <span
                      className="pointer-events-none absolute inset-0 rounded-md border"
                      style={{ backgroundColor: swatch }}
                      aria-hidden
                    />
                    <input
                      id={`color-${key}`}
                      type="color"
                      value={valid ? normalizeHex(value) : "#000000"}
                      onChange={(e) => setValue(key, e.target.value)}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      aria-label={`${label} color picker`}
                    />
                  </div>
                  {/* Synced hex text field */}
                  <Input
                    value={value}
                    onChange={(e) => setValue(key, e.target.value)}
                    spellCheck={false}
                    aria-invalid={!valid}
                    className={cn(
                      "font-mono",
                      !valid &&
                        "border-destructive focus-visible:ring-destructive/30"
                    )}
                    placeholder="#RRGGBB"
                  />
                </div>
                {!valid && (
                  <p className="text-destructive text-xs">
                    Enter a valid hex color (#RRGGBB)
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <RiRefreshLine size={16} className="mr-1.5" />
            Reset to defaults
          </Button>
          <Button type="button" onClick={handleSave} disabled={hasInvalid || saving}>
            {saving && (
              <RiLoader4Line size={16} className="mr-1.5 animate-spin" />
            )}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium">Live preview</p>
        <WidgetPreview
          {...preview}
          theme={previewTheme}
          targetOrigin={targetOrigin}
          autoHeight={false}
          className="h-[640px]"
        />
      </div>
    </div>
  );
}
