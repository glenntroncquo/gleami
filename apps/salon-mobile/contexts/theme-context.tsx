import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

type ThemeContextType = {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();

  // Static web export needs the system value recomputed client-side after
  // hydration (same reasoning as the pre-existing hooks/use-color-scheme.web.ts).
  const [hasHydrated, setHasHydrated] = useState(Platform.OS !== 'web');
  useEffect(() => {
    setHasHydrated(true);
  }, []);
  // RN 0.86 ColorSchemeName includes "unspecified"; treat that (and null) as light.
  const effectiveSystemScheme: 'light' | 'dark' =
    Platform.OS === 'web' && !hasHydrated
      ? 'light'
      : systemScheme === 'dark'
        ? 'dark'
        : 'light';

  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const colorScheme = preference === 'system' ? effectiveSystemScheme : preference;

  return <ThemeContext.Provider value={{ preference, colorScheme, setPreference }}>{children}</ThemeContext.Provider>;
}

/** Drop-in replacement for RN's `useColorScheme` — resolves the user's manual override, falling back to the system scheme. */
export function useColorScheme(): 'light' | 'dark' {
  const context = useContext(ThemeContext);
  return context?.colorScheme ?? 'light';
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return context;
}
