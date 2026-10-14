import { useAppointmentPayments } from '@/hooks/use-appointment-payments';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { SwipeActionRow } from '@/components/swipeable-row';
import { HeaderButton } from '@/components/header-button';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { ListGroup, ScreenTitle } from '@/components/ui';
import { StaffAvatar } from '@/components/staff-avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { fetchAppointmentById, fetchAppointmentsForMonth, fetchStaff, type StaffMember } from '@/lib/api/calendar';
import { fetchAbsences, type TimeOffEntry } from '@/lib/api/staff';

import {
  appointmentToEvent,
  groupAppointmentsByDateKey,
} from '@/components/calendar/calendar-data';
import { DaySheetSkeleton } from '@/components/calendar/components/CalendarSkeletons';
import { formatTime, getFullDateLabel, getISOWeekNumber, parseSalonWallClock, toDateKeyFromSalonClock } from '@/components/calendar/date-utils';
import { EventItem } from '@/components/calendar/types';

function localDayBounds(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
}

function staffLabel(member: StaffMember | undefined, fallback: string) {
  return `${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim() || fallback;
}

export default function DayScreen() {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const router = useRouter();
  const { date, staffId: staffIdParam } = useLocalSearchParams<{ date: string; staffId?: string }>();
  const { companyId, hasPermission } = useAuth();
  const canCheckout = hasPermission('pos:manage');
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [absences, setAbsences] = React.useState<TimeOffEntry[]>([]);
  const payments = useAppointmentPayments(companyId, events.map(event => event.appointmentId));
  const [staffById, setStaffById] = React.useState<Map<string, StaffMember>>(new Map());
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!date || !companyId || !locationId) {
      setLoading(false);
      return;
    }
    const target = new Date(date);
    const { start, end } = localDayBounds(date);
    const [appointments, staff, absenceRows] = await Promise.all([
      fetchAppointmentsForMonth(companyId, locationId, target.getFullYear(), target.getMonth()),
      fetchStaff(companyId, locationId),
      fetchAbsences(companyId, locationId, start, end),
    ]);
    const byDateKey = groupAppointmentsByDateKey(appointments, staffIdParam || null, colorScheme);
    setEvents(byDateKey[date] ?? []);
    setAbsences(staffIdParam ? absenceRows.filter((entry) => entry.staff_id === staffIdParam) : absenceRows);
    setStaffById(new Map(staff.map((member) => [member.id, member])));
    setLoading(false);
  }, [date, companyId, locationId, staffIdParam, colorScheme]);

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

      setEvents((prev) => {
        const without = prev.filter((event) => event.appointmentId !== appointmentId);
        if (!stillOnThisDay || !row) return without;
        return [...without, appointmentToEvent(row, colorScheme)].sort((a, b) => a.startISO.localeCompare(b.startISO));
      });
    },
    [companyId, date, load, locationId, staffIdParam, colorScheme]
  );

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

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
  const absenceBar = colorScheme === 'dark' ? theme.surfaceRaised : '#DDE1E8';
  const dayItems = React.useMemo(() => {
    if (!date) return [];
    const { start } = localDayBounds(date);
    const dayEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 0, 0);
    const absenceItems = absences.map((entry) => {
      const starts = new Date(entry.starts_at);
      const ends = new Date(entry.ends_at);
      const visibleStart = starts < start ? start : starts;
      const visibleEnd = ends > dayEnd ? dayEnd : ends;
      return { kind: 'absence' as const, at: visibleStart.getTime(), entry, startTime: formatTime(visibleStart.toISOString()), endTime: formatTime(visibleEnd.toISOString()) };
    });
    const eventItems = events.map((event) => ({
      kind: 'event' as const,
      at: parseSalonWallClock(event.startISO).getTime(),
      event,
    }));
    return [...absenceItems, ...eventItems].sort((a, b) => a.at - b.at);
  }, [absences, date, events]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
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
      ) : dayItems.length === 0 ? (
        <EmptyState
          icon="eventBusy"
          title={t('calendar.noAppointmentsToday')}
          subtitle={t('calendar.noAppointmentsTodayHint')}
          actionLabel={t('appointment.title')}
          onAction={() => router.push({ pathname: '/appointment-new', params: { date } })}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenTitle title={date ? getFullDateLabel(date) : ''} subtitle={t('calendar.weekLabel', { number: weekNumber })} />
          <ListGroup inset={14}>
          {dayItems.map((item) => {
            if (item.kind === 'absence') {
              const member = staffById.get(item.entry.staff_id);
              const name = staffLabel(member, t('calendar.employee'));
              return (
                <Pressable
                  key={`absence-${item.entry.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('calendar.unavailability.editTitle')}
                  onPress={() => router.push({ pathname: '/staff/time-off-new', params: { id: item.entry.id } })}
                  style={styles.row}>
                  <View style={[styles.colorBar, { backgroundColor: absenceBar }]} />
                  <View style={[styles.rowTimeCol, { width: 48 * fontScale }]}>
                    <Text style={[styles.time, { color: theme.text }]}>{item.startTime}</Text>
                    <Text style={[styles.timeMuted, { color: theme.muted }]}>{item.endTime}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.eventText, { color: theme.text }]} numberOfLines={1}>
                      {t('calendar.addUnavailability')}
                    </Text>
                    <Text style={[styles.eventSubtitle, { color: theme.muted }]} numberOfLines={1}>
                      {name}
                    </Text>
                  </View>
                  <StaffAvatar
                    imagePath={member?.image_path}
                    name={name}
                    size={32}
                    backgroundColor={theme.surface}
                    fontSize={11}
                  />
                </Pressable>
              );
            }

            const event = item.event;
            const payment = payments[event.appointmentId];
            const paid = payment?.status === 'paid';
            const partial = payment?.status === 'partial';
            return (
            <SwipeActionRow
              key={event.appointmentId}
              actionDisabled={paid || !canCheckout}
              actionLabel={t('checkout.title')}
              icon="pointOfSale"
              onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })}
              onAction={() => {
                if (paid || !canCheckout) return;
                router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
              }}>
            <View style={styles.row}>
              <View style={[styles.colorBar, { backgroundColor: event.color }]} />
              <View style={[styles.rowTimeCol, { width: 48 * fontScale }]}>
                <Text style={[styles.time, { color: theme.text }]}>{event.startTime}</Text>
                <Text style={[styles.timeMuted, { color: theme.muted }]}>{event.endTime}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.eventText, { color: theme.text }]} numberOfLines={1}>
                  {event.label}
                </Text>
                <Text style={[styles.eventSubtitle, { color: theme.muted }]} numberOfLines={1}>
                  {event.clientName}
                </Text>
              </View>
              {paid ? (
                <View accessibilityLabel={t('order.status.paid')} style={[styles.paymentBadge, { backgroundColor: theme.successSurface }]}>
                  <Text style={[styles.paymentBadgeAmount, { color: theme.success }]}>{t('order.status.paid')}</Text>
                </View>
              ) : partial ? (
                <View accessibilityLabel={`€${(payment.amountPaid ?? 0).toFixed(2)}`} style={[styles.paymentBadge, { backgroundColor: theme.warningSurface }]}>
                  <Text style={[styles.paymentBadgeAmount, { color: theme.warning }]}>{`€${(payment.amountPaid ?? 0).toFixed(2)}`}</Text>
                </View>
              ) : null}
              <StaffAvatar
                imagePath={staffById.get(event.staffId ?? '')?.image_path}
                name={event.staffName}
                size={32}
                backgroundColor={theme.surface}
                fontSize={11}
              />
            </View>
            </SwipeActionRow>
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, gap: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64 },
  colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  rowTimeCol: { gap: 2 },
  time: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  timeMuted: { fontSize: 13, fontVariant: ['tabular-nums'] },
  eventText: { fontSize: 16, fontWeight: '500' },
  eventSubtitle: { marginTop: 2, fontSize: 13 },
  paymentBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  paymentBadgeAmount: { fontSize: 12, fontWeight: '600' },
});
