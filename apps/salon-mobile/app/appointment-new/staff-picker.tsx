import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { StaffAvatar } from '@/components/staff-avatar';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';

import { APPOINTMENT_DRAFT_EVENTS } from '@/lib/appointment-draft';

function clientDisplayName(first: string | null | undefined, last: string | null | undefined, fallback: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || fallback;
}

export default function StaffPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId: selectedStaffId } = useLocalSearchParams<{ staffId?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    fetchStaff(companyId, locationId)
      .then(setStaffList)
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));
  }, [companyId, locationId]);

  const selectStaff = React.useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.selectStaff, { staffId: id });
      router.back();
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.staffMember'),
        }}
      />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.muted} />
      ) : staffList.length === 0 ? (
        <EmptyState compact icon="groups" title={t('staff.noStaff')} subtitle={t('staff.noStaffHint')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic">
          {staffList.map((staff) => {
            const name = clientDisplayName(staff.first_name, staff.last_name, t('calendar.employee'));
            const isSelected = selectedStaffId === staff.id;
            return (
              <Pressable key={staff.id} style={styles.row} onPress={() => selectStaff(staff.id)}>
                <StaffAvatar imagePath={null} name={name} size={40} />
                <Text style={[styles.rowName, styles.flexFill]}>{name}</Text>
                {isSelected ? <AppIcon name="check" size={18} color={theme.text} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: typeof Colors.light) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flexFill: {
      flex: 1,
    },
    loading: {
      marginTop: 24,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
