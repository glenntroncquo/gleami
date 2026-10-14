import { AppointmentPaymentPanel } from '@/components/appointment-payment-panel';
import { AppIcon } from '@/components/app-icon';
import { DetailSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { HeaderButton } from '@/components/header-button';
import { ErrorBanner } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchAppointmentById, type AppointmentRow } from '@/lib/api/calendar';
import { Colors } from '@/constants/theme';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { companyId, hasPermission } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const canCheckout = hasPermission('pos:manage');
  const [appointment, setAppointment] = React.useState<AppointmentRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchAppointmentById(appointmentId)
      .then((value) => {
        if (!active) return;
        setAppointment(value);
        if (!value) setError(t('checkout.failedToLoad'));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t('checkout.failedToLoad'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentId, t]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('checkout.title'),
          headerShadowVisible: false,
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />

      {loading ? (
        <DetailSkeleton />
      ) : !appointment ? (
        <>
          <ErrorBanner message={error} />
          <EmptyState icon="eventBusy" title={error ?? t('checkout.failedToLoad')} />
        </>
      ) : (
        <AppointmentPaymentPanel appointment={appointment} companyId={companyId} canCheckout={canCheckout} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
