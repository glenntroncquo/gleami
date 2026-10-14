import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Stack, useFocusEffect } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DashboardSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { MonthlyBarChart } from '@/components/monthly-bar-chart';
import { ErrorBanner, SectionHeader, useTheme, type Theme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { fetchMonthlyAppointments, fetchMonthlyClients, fetchRevenue, MonthlyCountData, RevenueData } from '@/lib/api/dashboard';

import { getMonthShortLabel } from '@/components/calendar/date-utils';

const RECENT_MONTHS = 6;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const theme = useTheme();
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
        <View style={styles.bannerWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading || locationLoading ? (
        <DashboardSkeleton />
      ) : showNoCompanyState ? (
        <EmptyState icon="viewAgenda" title={t('calendar.noCompany')} />
      ) : showNoLocationState ? (
        <EmptyState icon="viewAgenda" title={t('calendar.noLocation')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.metrics}>
            {revenue ? <MetricCard styles={styles} label={t('dashboard.revenue')} value={`€${revenue.totalRevenue.toFixed(2)}`} wide /> : null}
            {appointments ? <MetricCard styles={styles} label={t('dashboard.appointments')} value={String(appointments.total)} /> : null}
            {clients ? <MetricCard styles={styles} label={t('dashboard.clients')} value={String(clients.total)} /> : null}
          </View>
          <Text style={styles.hint}>{t('dashboard.last12Months')}</Text>

          {revenue ? (
            <View style={styles.section}>
              <SectionHeader title={t('dashboard.revenue')} />
              <View style={styles.card}>
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
            </View>
          ) : null}

          {appointments ? (
            <View style={styles.section}>
              <SectionHeader title={t('dashboard.appointments')} />
              <View style={styles.card}>
                <MonthlyBarChart
                  data={appointments.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                    label: getMonthShortLabel(m.monthIndex),
                    values: [m.count],
                  }))}
                  series={[{ label: t('dashboard.appointments'), color: theme.text }]}
                  formatValue={(value) => String(Math.round(value))}
                />
              </View>
            </View>
          ) : null}

          {clients ? (
            <View style={styles.section}>
              <SectionHeader title={t('dashboard.clients')} />
              <View style={styles.card}>
                <MonthlyBarChart
                  data={clients.monthlyData.slice(-RECENT_MONTHS).map((m) => ({
                    label: getMonthShortLabel(m.monthIndex),
                    values: [m.count],
                  }))}
                  series={[{ label: t('dashboard.clients'), color: theme.text }]}
                  formatValue={(value) => String(Math.round(value))}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function MetricCard({ label, value, wide, styles }: { label: string; value: string; wide?: boolean; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={[styles.metricCard, wide && styles.metricCardWide]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    bannerWrap: { paddingHorizontal: Design.screenPadding, paddingTop: 12 },
    scrollContent: { padding: Design.screenPadding, paddingBottom: 48, gap: 24 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: {
      flexGrow: 1,
      flexBasis: '40%',
      gap: 6,
      padding: 16,
      borderRadius: Design.cardRadius,
      backgroundColor: theme.surface,
    },
    metricCardWide: { flexBasis: '100%' },
    metricLabel: { fontSize: 13, fontWeight: '500', color: theme.muted },
    metricValue: { fontSize: 26, fontWeight: '700', color: theme.text, letterSpacing: -0.3 },
    hint: { fontSize: 12, color: theme.muted, marginTop: -12 },
    section: { gap: 8 },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: Design.cardRadius,
      padding: 16,
    },
  });
