import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { SwipeableRow } from '@/components/swipeable-row';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScheduleException, deleteTimeOff, fetchTimeOff } from '@/lib/api/staff';

function formatDateLabel(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function StaffTimeOffScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [blocks, setBlocks] = React.useState<ScheduleException[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchTimeOff(id, companyId, locationId ?? undefined);
      setBlocks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoadTimeOff'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = async (blockId: string) => {
    try {
      await deleteTimeOff(blockId);
      setBlocks((prev) => prev.filter((item) => item.id !== blockId));
    } catch {
      setError(t('staff.failedToDeleteTimeOff'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('staff.timeOff') }} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {blocks.length === 0 ? (
            <EmptyState
              compact
              icon="eventBusy"
              title={t('staff.noTimeOff')}
              subtitle={t('staff.noTimeOffHint')}
            />
          ) : (
            blocks.map((block) => {
              const start = block.starts_at ? new Date(block.starts_at) : null;
              const end = block.ends_at ? new Date(block.ends_at) : null;
              return (
                <SwipeableRow key={block.id} onDelete={() => handleDelete(block.id)} deleteLabel={t('common.delete')}>
                  <View style={styles.blockRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockDate}>{start ? formatDateLabel(start) : '—'}</Text>
                      <Text style={styles.blockTime}>
                        {start && end ? `${formatTimeLabel(start)} – ${formatTimeLabel(end)}` : '—'}
                      </Text>
                    </View>
                  </View>
                </SwipeableRow>
              );
            })
          )}
          <Pressable style={{ marginTop: 12 }} onPress={() => router.push({ pathname: '/staff/time-off-new', params: { staffId: id } })}>
            <Text style={styles.addLink}>{t('staff.addTimeOff')}</Text>
          </Pressable>
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
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
    },
    blockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    blockDate: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    blockTime: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    addLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.tint,
    },
  });
