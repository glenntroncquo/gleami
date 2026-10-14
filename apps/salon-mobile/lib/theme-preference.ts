export type ThemePreference = 'light' | 'dark' | 'system';

/** Match marketplace by default without overwriting an explicit user choice. */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

export function readThemePreference(saved: string | null): ThemePreference {
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : DEFAULT_THEME_PREFERENCE;
}
