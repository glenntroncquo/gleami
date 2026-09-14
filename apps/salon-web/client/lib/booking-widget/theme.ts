/**
 * Shared, framework-agnostic definitions for the Salonify booking widget theme.
 * Safe to import from both client and server code (no runtime dependencies).
 */

export const WIDGET_THEME_KEYS = [
  "primary",
  "primaryHover",
  "primaryLight",
  "secondary",
  "text",
  "background",
  "buttonText",
] as const;

export type WidgetThemeKey = (typeof WIDGET_THEME_KEYS)[number];

export type WidgetTheme = Record<WidgetThemeKey, string>;

/** Default theme used when a company has no saved config (or a key is missing/invalid). */
export const DEFAULT_WIDGET_THEME: WidgetTheme = {
  primary: "#FF6B9D",
  primaryHover: "#E91E63",
  primaryLight: "#FFB3D1",
  secondary: "#FFF0F5",
  text: "#1F2937",
  background: "#FEFEFE",
  buttonText: "#FFFFFF",
};

/** Metadata describing each token for the editor UI. */
export const WIDGET_THEME_TOKENS: {
  key: WidgetThemeKey;
  label: string;
  purpose: string;
}[] = [
  {
    key: "primary",
    label: "Primary",
    purpose: "Main accent — buttons, borders, selected states",
  },
  {
    key: "primaryHover",
    label: "Primary hover",
    purpose: "Button hover background",
  },
  {
    key: "primaryLight",
    label: "Primary light",
    purpose: "Light tint for selected items",
  },
  {
    key: "secondary",
    label: "Secondary",
    purpose: "Secondary background (selected time slots)",
  },
  { key: "text", label: "Text", purpose: "Global text color" },
  { key: "background", label: "Background", purpose: "Global background" },
  {
    key: "buttonText",
    label: "Button text",
    purpose: "Text/icon color on primary buttons & badges",
  },
];

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/** Returns true for a valid 6-digit hex color (e.g. #RRGGBB). */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_REGEX.test(value.trim());
}

/** Normalize a hex string to lowercase with a leading "#" (assumes it is valid). */
export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Build a complete, valid theme from an untrusted partial object.
 * Any missing or invalid key falls back to the default theme value.
 */
export function sanitizeTheme(input: unknown): WidgetTheme {
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const result = {} as WidgetTheme;
  for (const key of WIDGET_THEME_KEYS) {
    const raw = source[key];
    result[key] = isValidHexColor(raw)
      ? normalizeHex(raw)
      : DEFAULT_WIDGET_THEME[key];
  }
  return result;
}

/**
 * Validate an untrusted partial object, returning only the valid keys
 * (normalized). Used server-side to reject invalid colors before saving.
 */
export function pickValidTheme(input: unknown): Partial<WidgetTheme> {
  const source =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const result: Partial<WidgetTheme> = {};
  for (const key of WIDGET_THEME_KEYS) {
    const raw = source[key];
    if (isValidHexColor(raw)) {
      result[key] = normalizeHex(raw);
    }
  }
  return result;
}
