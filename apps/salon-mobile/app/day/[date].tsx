import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { SwipeActionRow } from '@/components/swipeable-row';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  DeviceEventEmitter,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { StaffAvatar } from '@/components/staff-avatar';
import { Colors } from '@/constants/theme';
import { useCheckout } from '@/contexts/checkout-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { fetchAppointmentById, fetchAppointmentsForMonth, fetchStaff, type AppointmentRow } from '@/lib/api/calendar';

import {
  appointmentToEvent,
  groupAppointmentsByDateKey,
} from '@/components/calendar/calendar-data';
import { DaySheetSkeleton } from '@/components/calendar/components/CalendarSkeletons';
import { getFullDateLabel, getISOWeekNumber, getListHeaderLabel, toDateKeyFromSalonClock } from '@/components/calendar/date-utils';
import { EventItem } from '@/components/calendar/types';

export default function DayScreen() {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const { prepareCheckout } = useCheckout();
  const appointmentsById = React.useRef(new Map<string, AppointmentRow>());
  const { date, staffId: staffIdParam } = useLocalSearchParams<{ date: string; staffId?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [staffImageById, setStaffImageById] = React.useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!date || !companyId || !locationId) {
      setLoading(false);
      return;
    }
    const target = new Date(date);
    const [appointments, staff] = await Promise.all([
      fetchAppointmentsForMonth(companyId, locationId, target.getFullYear(), target.getMonth()),
      fetchStaff(companyId, locationId),
    ]);
    appointmentsById.current = new Map(appointments.map((appointment) => [appointment.id, appointment]));
    const byDateKey = groupAppointmentsByDateKey(appointments, staffIdParam || null);
    setEvents(byDateKey[date] ?? []);
    setStaffImageById(new Map(staff.map((member) => [member.id, member.image_path])));
    setLoading(false);
  }, [date, companyId, locationId, staffIdParam]);

  const applyAppointmentChange = React.useCallback(
    async (appointmentId?: string) => {
      if (!date || !companyId || !locationId) return;
      if (!appointmentId) {
        await load();
        return;
      }

      const row = await fetchAppointmentById(appointmentId);
      const stillOnThisDay =
        row &&
        !isAppointmentCanceled(row) &&
        toDateKeyFromSalonClock(row.start) === date &&
        (!staffIdParam ||
          row.appointment_segment.some((segment) => segment.staff_id === staffIdParam) ||
          row.staff?.id === staffIdParam);

      if (stillOnThisDay && row) appointmentsById.current.set(appointmentId, row);
      else appointmentsById.current.delete(appointmentId);

      setEvents((prev) => {
        const without = prev.filter((event) => event.appointmentId !== appointmentId);
        if (!stillOnThisDay || !row) return without;
        return [...without, appointmentToEvent(row)].sort((a, b) => a.startISO.localeCompare(b.startISO));
      });
    },
    [companyId, date, load, locationId, staffIdParam]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'calendarRefreshAppointments',
      (payload?: { appointmentId?: string }) => {
        applyAppointmentChange(payload?.appointmentId);
      }
    );
    return () => subscription.remove();
  }, [applyAppointmentChange]);

  const weekNumber = date ? getISOWeekNumber(new Date(date)) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: date ? getListHeaderLabel(date) : '',
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
          unstable_headerRightItems: () => [
            {
              type: 'button',
              label: t('appointment.title'),
              icon: { type: 'sfSymbol', name: 'plus' },
              tintColor: theme.text,
              onPress: () => router.push({ pathname: '/appointment-new', params: { date } }),
            },
          ],
          headerRight: () => (
            <HeaderButton onPress={() => router.push({ pathname: '/appointment-new', params: { date } })} hitSlop={8}>
              <AppIcon name="add" size={24} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />

      {loading ? (
        <DaySheetSkeleton backgroundColor={theme.background} surfaceColor={theme.surface} />
      ) : events.length === 0 ? (
        <EmptyState
          icon="eventBusy"
          title={t('calendar.noAppointmentsToday')}
          subtitle={t('calendar.noAppointmentsTodayHint')}
          actionLabel={t('appointment.title')}
          onAction={() => router.push({ pathname: '/appointment-new', params: { date } })}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View accessibilityRole="header">
            <Text style={[styles.title, { color: theme.text }]}>{date ? getFullDateLabel(date) : ''}</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>{t('calendar.weekLabel', { number: weekNumber })}</Text>
          </View>
          {events.map((event) => (
            <SwipeActionRow
              key={event.appointmentId}
              actionLabel={t('checkout.title')}
              icon="pointOfSale"
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })}
              onAction={() => {
                const appointment = appointmentsById.current.get(event.appointmentId);
                if (appointment) prepareCheckout(appointment);
                router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
              }}>
            <View style={styles.row}>
              <View style={[styles.colorBar, { backgroundColor: event.color }]} />
              <View style={[styles.rowTimeCol, { width: 48 * fontScale }]}>
                <Text style={[styles.time, { color: theme.text }]}>{event.startTime}</Text>
                <Text style={[styles.timeMuted, { color: theme.muted }]}>{event.endTime}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.eventText, { color: theme.text }]}>
                  {event.label}
                </Text>
                <Text style={[styles.eventSubtitle, { color: theme.muted }]}>
                  {event.clientName} · {event.staffName}
                </Text>
              </View>
              <StaffAvatar
                imagePath={staffImageById.get(event.staffId ?? '')}
                name={event.staffName}
                size={32}
                backgroundColor={theme.surface}
                fontSize={9}
              />

            </View>
            </SwipeActionRow>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 14,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorBar: {
    width: 3,
    height: 40,
    borderRadius: 2,
  },
  rowTimeCol: {
    width: 56,
  },
  time: {
    fontSize: 14,
  },
  timeMuted: {
    fontSize: 12,
  },
  eventText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },

});
