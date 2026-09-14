import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Stack, useFocusEffect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { MonthlyBarChart } from '@/components/monthly-bar-chart';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMonthlyAppointments, fetchMonthlyClients, fetchRevenue, MonthlyCountData, RevenueData } from '@/lib/api/dashboard';

import { getMonthShortLabel } from '@/components/calendar/date-utils';

const RECENT_MONTHS = 6;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [revenue, setRevenue] = React.useState<RevenueData | null>(null);
  const [appointments, setAppointments] = React.useState<MonthlyCountData | null>(null);
  const [clients, setClients] = React.useState<MonthlyCountData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    if (!locationId) {
      setRevenue(null);
      setAppointments(null);
      setClients(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [revenueData, appointmentsData, clientsData] = await Promise.all([
        fetchRevenue(companyId, locationId),
        fetchMonthlyAppointments(companyId, locationId),
        fetchMonthlyClients(companyId, locationId),
      ]);
      setRevenue(revenueData);
      setAppointments(appointmentsData);
      setClients(clientsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, locationId, locationLoading, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const showNoCompanyState = !loading && !locationLoading && !companyId;
  const showNoLocationState = !loading && !locationLoading && !!companyId && !locationId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('dashboard.title') }} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading || locationLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : showNoCompanyState ? (
        <EmptyState icon="viewAgenda" title={t('calendar.noCompany')} />
      ) : showNoLocationState ? (
        <EmptyState icon="viewAgenda" title={t('calendar.noLocation')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {revenue ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.revenue')}</Text>
              <Text style={styles.cardHeadline}>{`€${revenue.totalRevenue.toFixed(2)}`}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={revenue.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.revenue, m.revenueExclVat],
                }))}
                series={[
                  { label: t('dashboard.revenueGross'), color: theme.text },
                  { label: t('dashboard.revenueNet'), color: theme.muted },
                ]}
                formatValue={(value) => `€${value.toFixed(0)}`}
              />
            </View>
          ) : null}

          {appointments ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.appointments')}</Text>
              <Text style={styles.cardHeadline}>{appointments.total}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={appointments.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.count],
                }))}
                series={[{ label: t('dashboard.appointments'), color: theme.text }]}
                formatValue={(value) => String(Math.round(value))}
              />
            </View>
          ) : null}

          {clients ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('dashboard.clients')}</Text>
              <Text style={styles.cardHeadline}>{clients.total}</Text>
              <Text style={styles.cardHint}>{t('dashboard.last12Months')}</Text>
              <MonthlyBarChart
                data={clients.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                  label: getMonthShortLabel(m.monthIndex),
                  values: [m.count],
                }))}
                series={[{ label: t('dashboard.clients'), color: theme.text }]}
                formatValue={(value) => String(Math.round(value))}
              />
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: Design.controlRadius,
      backgroundColor: theme.errorSurface,
    },
    errorBannerText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '600',
    },
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateText: {
      fontSize: 15,
      color: theme.muted,
    },
    scrollContent: {
      padding: 16,
      gap: 20,
      paddingBottom: 48,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
    },
    cardHeadline: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginTop: 4,
    },
    cardHint: {
      fontSize: 12,
      color: theme.muted,
      marginBottom: 16,
    },
  });
