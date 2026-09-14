import { CheckoutProvider } from '@/contexts/checkout-context';
import { CrashRecovery } from '@/components/crash-recovery';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { LocationProvider } from '@/contexts/location-context';
import { ThemePreferenceProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n, { initI18n } from '@/lib/i18n';
import { initSentry, Sentry, setSentryStaffContext } from '@/lib/sentry';
import { DarkTheme, DefaultTheme, ErrorBoundaryProps, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

initSentry();

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.error,
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.error,
  },
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <CrashRecovery onRetry={retry} />;
}

function SentryStaffContext() {
  const { user, companyId } = useAuth();

  useEffect(() => {
    setSentryStaffContext(user?.id ?? null, companyId);
  }, [user?.id, companyId]);

  return null;
}

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        // Otherwise iOS falls back to the previous screen's route name (e.g.
        // the literal "(tabs)") as the back-button label whenever that
        // screen has no title of its own — show just the chevron instead.
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointment-new/index" options={{ presentation: 'modal' }} />
        {/*
          Single-detent formSheet, not [0.5, 1]: with two detents, dragging
          between them makes RN re-layout the whole subtree every frame,
          which is what made these feel janky vs. the plain modal screens.
          One detent means the only drag interaction left is dismiss, which
          — like `modal` — is a native transform, not a JS-driven resize.

          Accepted tradeoff: iOS's formSheet is inset from all four edges on
          iPhone portrait (no public API to force edge-attachment there —
          prefersEdgeAttachedInCompactHeight only affects landscape), so
          there's a small permanent gap at the bottom. Decided that's worth
          it for the shorter height and native drag smoothness.
        */}
        <Stack.Screen
          name="appointment-new/client-picker"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        <Stack.Screen
          name="appointment-new/new-client"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.7], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        <Stack.Screen
          name="appointment-new/service-picker"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        {/*
          service-variants and staff-picker fetch their list after the sheet
          first mounts, so `fitToContents` sized the sheet for the loading
          spinner, not the real (taller) list — the extra rows landed past
          the sheet's actual bottom edge, in the dimmed backdrop, where they
          were visible but untappable. Fixed detents sidestep that.
        */}
        <Stack.Screen
          name="appointment-new/service-variants"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.55], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        <Stack.Screen
          name="appointment-new/staff-picker"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        <Stack.Screen
          name="date-time-picker"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.38], sheetGrabberVisible: true, sheetCornerRadius: 20 }}
        />
        <Stack.Screen name="appointment/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="client/[id]" />
        <Stack.Screen name="client/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="services/index" />
        <Stack.Screen name="services/[id]" />
        <Stack.Screen name="services/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="services/price-option" options={{ presentation: 'modal' }} />
        <Stack.Screen name="staff/index" />
        <Stack.Screen name="staff/[id]" />
        <Stack.Screen name="staff/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="staff/[id]/availability" />
        <Stack.Screen name="staff/[id]/time-off" />
        <Stack.Screen name="staff/[id]/schedule" />
        <Stack.Screen name="staff/time-off-new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="checkout/[appointmentId]" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="dashboard/index" />
        <Stack.Screen name="settings/index" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <ThemePreferenceProvider>
          <AuthProvider>
            <LocationProvider>
              <SentryStaffContext />
              <Sentry.ErrorBoundary fallback={({ resetError }) => <CrashRecovery onRetry={resetError} />}>
                <CheckoutProvider>
                  <RootLayoutInner />
                </CheckoutProvider>
              </Sentry.ErrorBoundary>
            </LocationProvider>
          </AuthProvider>
        </ThemePreferenceProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
