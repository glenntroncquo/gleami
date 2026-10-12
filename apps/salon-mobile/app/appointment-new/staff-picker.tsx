import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { StaffAvatar } from '@/components/staff-avatar';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { ListGroup, ListRow, ScreenTitle, useTheme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';

import { APPOINTMENT_DRAFT_EVENTS } from '@/lib/appointment-draft';

function clientDisplayName(first: string | null | undefined, last: string | null | undefined, fallback: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || fallback;
}

export default function StaffPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId: selectedStaffId, next } = useLocalSearchParams<{ staffId?: string; next?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const theme = useTheme();

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
      if (next === 'services') {
        router.replace({ pathname: '/appointment-new/service-picker', params: { staffId: id } });
        return;
      }
      router.back();
    },
    [next, router]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <RowListSkeleton count={6} />
      ) : staffList.length === 0 ? (
        <EmptyState compact icon="groups" title={t('staff.noStaff')} subtitle={t('staff.noStaffHint')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic">
          <ScreenTitle title={t('appointment.staffMember')} />
          <ListGroup>
            {staffList.map((staff) => {
              const name = clientDisplayName(staff.first_name, staff.last_name, t('calendar.employee'));
              return (
                <ListRow
                  key={staff.id}
                  title={name}
                  leading={<StaffAvatar imagePath={staff.image_path} name={name} size={40} />}
                  selected={selectedStaffId === staff.id}
                  chevron={false}
                  onPress={() => selectStaff(staff.id)}
                />
              );
            })}
          </ListGroup>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Design.screenPadding, paddingTop: 24, paddingBottom: 32, gap: 16 },
});
