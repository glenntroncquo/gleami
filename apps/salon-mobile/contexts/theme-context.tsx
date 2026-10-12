import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, AppState, Platform, type ColorSchemeName } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

type ThemeContextType = {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveScheme(scheme: ColorSchemeName | null | undefined): 'light' | 'dark' {
  return scheme === 'dark' ? 'dark' : 'light';
}

/**
 * iOS ignores interface-style changes that happen while the app is backgrounded
 * and then keeps returning the old scheme. Toggling the window off the system
 * style and straight back makes it emit the phone's current setting.
 */
function rereadSystemScheme(onSettled: (scheme: 'light' | 'dark') => void) {
  if (Platform.OS === 'ios') {
    // A plain "unspecified" write does not emit when the window is already
    // following the system, so a scheme cached before backgrounding sticks.
    const seen = Appearance.getColorScheme();
    Appearance.setColorScheme(seen === 'dark' ? 'light' : 'dark');
  }
  Appearance.setColorScheme('unspecified');
  const timer = setTimeout(() => {
    onSettled(resolveScheme(Appearance.getColorScheme()));
  }, 100);
  return () => clearTimeout(timer);
}

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [hasHydrated, setHasHydrated] = useState(Platform.OS !== 'web');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(() =>
    Platform.OS === 'web' ? 'light' : resolveScheme(Appearance.getColorScheme())
  );
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [preferenceReady, setPreferenceReady] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (!active) return;
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreferenceState(saved);
      })
      .finally(() => {
        if (active) setPreferenceReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preferenceReady) return;

    if (Platform.OS === 'web') {
      setSystemScheme(resolveScheme(Appearance.getColorScheme()));
      const appearance = Appearance.addChangeListener(({ colorScheme: next }) => {
        setSystemScheme(resolveScheme(next));
      });
      return () => appearance.remove();
    }

    if (preference !== 'system') {
      Appearance.setColorScheme(preference);
      return;
    }

    let ignoreEvents = true;
    let cancelReread = rereadSystemScheme((scheme) => {
      ignoreEvents = false;
      setSystemScheme(scheme);
    });
    const appearance = Appearance.addChangeListener(({ colorScheme: next }) => {
      if (ignoreEvents) return;
      if (next === 'light' || next === 'dark') setSystemScheme(next);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      ignoreEvents = true;
      cancelReread();
      cancelReread = rereadSystemScheme((scheme) => {
        ignoreEvents = false;
        setSystemScheme(scheme);
      });
    });

    return () => {
      cancelReread();
      appearance.remove();
      appState.remove();
      Appearance.setColorScheme('unspecified');
    };
  }, [preference, preferenceReady]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  };

  const colorScheme = preference === 'system' ? (hasHydrated ? systemScheme : 'light') : preference;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void SystemUI.setBackgroundColorAsync(colorScheme === 'dark' ? '#000000' : '#FFFFFF');
  }, [colorScheme]);

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
