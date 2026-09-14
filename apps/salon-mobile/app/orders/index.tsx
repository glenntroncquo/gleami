import { Pressable } from '@/components/pressable-scale';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchOrders, OrderListItem } from '@/lib/api/orders';

function statusStyle(status: string | null, theme: typeof Colors.light) {
  return { backgroundColor: theme.surface, color: status === 'paid' ? theme.text : theme.muted };
}

function formatDate(value: string) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function OrdersListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [orders, setOrders] = React.useState<OrderListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    if (!locationId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOrders(companyId, locationId);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, locationId, locationLoading, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const showNoCompanyState = !loading && !locationLoading && !companyId;
  const showNoLocationState = !loading && !locationLoading && !!companyId && !locationId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('order.title') }} />

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
        <EmptyState icon="pointOfSale" title={t('calendar.noCompany')} />
      ) : showNoLocationState ? (
        <EmptyState icon="pointOfSale" title={t('calendar.noLocation')} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[styles.listContent, orders.length === 0 && styles.listContentEmpty]}
          ListEmptyComponent={
            <EmptyState icon="pointOfSale" title={t('order.noOrders')} subtitle={t('order.noOrdersHint')} />
          }
          renderItem={({ item }) => {
            const clientName =
              `${item.client?.first_name ?? ''} ${item.client?.last_name ?? ''}`.trim() || t('calendar.unknownClient');
            const badge = statusStyle(item.payment_status, theme);
            return (
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowClient}>{clientName}</Text>
                  <Text style={styles.rowDate}>{formatDate(item.date ?? item.created_at)}</Text>
                </View>
                <Text style={styles.rowTotal}>{`€${(item.total_amount ?? 0).toFixed(2)}`}</Text>
                <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {t(`order.status.${item.payment_status === 'partially_paid' ? 'partial' : item.payment_status ?? 'unknown'}`)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
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
      paddingTop: 60,
    },
    stateText: {
      fontSize: 15,
      color: theme.muted,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowClient: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowDate: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    rowTotal: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
