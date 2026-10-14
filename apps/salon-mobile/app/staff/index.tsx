import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { StaffAvatar } from '@/components/staff-avatar';
import { ListRow } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchAllStaff, Staff } from '@/lib/api/staff';

function staffName(staff: Staff, fallback: string) {
  return `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || fallback;
}

export default function StaffListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [staff, setStaff] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAllStaff(companyId);
      setStaff(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

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

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('staff.title') }} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <RowListSkeleton />
      ) : showNoCompanyState ? (
        <EmptyState icon="groups" title={t('calendar.noCompany')} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, staff.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              icon="groups"
              title={t('staff.noStaff')}
              subtitle={t('staff.noStaffHint')}
              actionLabel={t('staff.addNew')}
              onAction={() => router.push('/staff/new')}
            />
          }
          renderItem={({ item }) => {
            const name = staffName(item, t('calendar.employee'));
            const subtitle = item.specialization ?? '';
            return (
              <ListRow
                title={name}
                subtitle={subtitle}
                leading={
                  <StaffAvatar
                    imagePath={item.image_path}
                    name={name}
                    size={40}
                    backgroundColor={theme.surface}
                    textColor={theme.text}
                    fontSize={14}
                  />
                }
                onPress={() => router.push({ pathname: '/staff/[id]', params: { id: item.id } })}
              />
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <Pressable
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel={t('staff.addNew')}
          onPress={() => router.push('/staff/new')}>
          <AppIcon name="add" size={26} color={theme.background} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

// ListRow carries 14px horizontal padding, so the list pads only the remainder to align with the screen edge.
const ROW_INSET = 16;

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    errorBanner: {
      marginHorizontal: Design.screenPadding,
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
    listContent: {
      paddingHorizontal: Design.screenPadding - ROW_INSET,
      paddingTop: 8,
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: ROW_INSET + 40 + 12,
      marginRight: ROW_INSET,
      backgroundColor: theme.separator,
    },
    fab: {
      position: 'absolute',
      right: Design.screenPadding,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.text,
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  });
