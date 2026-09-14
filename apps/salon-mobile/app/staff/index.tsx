import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { StaffAvatar } from '@/components/staff-avatar';
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
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : showNoCompanyState ? (
        <EmptyState icon="groups" title={t('calendar.noCompany')} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, staff.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/staff/[id]', params: { id: item.id } })}>
                <StaffAvatar
                  imagePath={item.image_path}
                  name={name}
                  size={40}
                  backgroundColor={theme.border}
                  textColor={theme.text}
                  fontSize={14}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{name}</Text>
                  {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
                </View>
                <AppIcon name="chevronRight" size={22} color={theme.muted} />
              </Pressable>
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/staff/new')}>
          <AppIcon name="add" size={26} color={theme.text} />
        </TouchableOpacity>
      ) : null}
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
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
  });
