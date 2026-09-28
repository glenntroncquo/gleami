import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { appointmentInstant, type MyAppointment } from '@/src/api/appointments';
import { useAuth } from '@/src/auth/auth-context';
import { ErrorState, OfflineState, ScreenState } from '@/src/components/screen-state';
import { SkeletonBlock } from '@/src/components/skeleton';
import { formatPrice } from '@/src/format';
import { useCancelMyAppointment, useMyAppointments } from '@/src/hooks/use-appointments';
import { usePullRefresh } from '@/src/hooks/use-pull-refresh';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';
import { brandColors } from '@/src/theme/colors';

const LOCALE = 'nl-BE';

type AppointmentSection = { title: string; data: MyAppointment[] };

function isUpcoming(appointment: MyAppointment, now: Date): boolean {
  return !appointment.isCanceled && appointmentInstant(appointment.startsAt) >= now;
}

/** Salon-local labels: start/end are naive UTC, so render in the salon's timezone. */
function dayLabel(appointment: MyAppointment): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: appointment.locationTimezone ?? undefined,
  }).format(appointmentInstant(appointment.startsAt));
}

function timeRangeLabel(appointment: MyAppointment): string {
  const timeZone = appointment.locationTimezone ?? undefined;
  const format = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', timeZone });
  return `${format.format(appointmentInstant(appointment.startsAt))} – ${format.format(appointmentInstant(appointment.endsAt))}`;
}

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const online = useOnline();
  const appointments = useMyAppointments();
  const pullRefresh = usePullRefresh(appointments.refetch);
  const cancel = useCancelMyAppointment();

  // Tabs stay mounted, so coming back from the booking flow needs an explicit refetch.
  const refetch = appointments.refetch;
  const userId = user?.id;
  useFocusEffect(
    useCallback(() => {
      if (userId) void refetch();
    }, [userId, refetch]),
  );

  const sections = useMemo<AppointmentSection[]>(() => {
    const now = new Date();
    const rows = appointments.data ?? [];
    const upcoming = rows
      .filter((item) => isUpcoming(item, now))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const past = rows
      .filter((item) => !isUpcoming(item, now))
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return [
      { title: t('bookings.upcoming'), data: upcoming },
      { title: t('bookings.past'), data: past },
    ].filter((section) => section.data.length > 0);
  }, [appointments.data]);

  function confirmCancel(appointment: MyAppointment) {
    Alert.alert(t('bookings.cancelTitle'), t('bookings.cancelBody'), [
      { text: t('bookings.cancelKeep'), style: 'cancel' },
      {
        text: t('bookings.cancelConfirm'),
        style: 'destructive',
        onPress: () =>
          cancel.mutate(appointment.id, {
            onError: () => Alert.alert(t('states.errorTitle'), t('bookings.cancelError')),
          }),
      },
    ]);
  }

  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}>
      <Text className="px-5 pb-3 text-3xl font-semibold tracking-tight text-ink">{t('bookings.title')}</Text>
      {loading ? (
        <View className="gap-4 px-5 pt-2">
          <SkeletonBlock style={{ height: 116, borderRadius: 20 }} />
          <SkeletonBlock style={{ height: 116, borderRadius: 20 }} />
        </View>
      ) : !user ? (
        <View className="flex-1 justify-center">
          <ScreenState
            icon="calendar-outline"
            title={t('bookings.signInTitle')}
            body={t('bookings.signInBody')}
            actionLabel={t('bookings.signIn')}
            onAction={() => router.push('/auth')}
          />
        </View>
      ) : !online && !appointments.data ? (
        <OfflineState onRetry={() => appointments.refetch()} />
      ) : appointments.isLoading ? (
        <View className="gap-4 px-5 pt-2">
          <SkeletonBlock style={{ height: 116, borderRadius: 20 }} />
          <SkeletonBlock style={{ height: 116, borderRadius: 20 }} />
        </View>
      ) : appointments.isError ? (
        <View className="flex-1 justify-center">
          <ErrorState onRetry={() => appointments.refetch()} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 }}
          refreshing={pullRefresh.refreshing}
          onRefresh={pullRefresh.onRefresh}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <ScreenState
              icon="calendar-outline"
              title={t('bookings.emptyTitle')}
              body={t('bookings.emptyBody')}
              actionLabel={t('bookings.discover')}
              onAction={() => router.push('/(tabs)')}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text className="mb-2 mt-3 text-xs font-semibold uppercase tracking-widest text-muted">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <AppointmentCard
              appointment={item}
              upcoming={isUpcoming(item, new Date())}
              cancelPending={cancel.isPending && cancel.variables === item.id}
              onCancel={() => confirmCancel(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function AppointmentCard({
  appointment,
  upcoming,
  cancelPending,
  onCancel,
}: {
  appointment: MyAppointment;
  upcoming: boolean;
  cancelPending: boolean;
  onCancel: () => void;
}) {
  return (
    <View className="mb-3 rounded-card bg-surface p-4">
      <Pressable
        onPress={() => router.push({ pathname: '/salon/[slug]', params: { slug: appointment.locationSlug } })}
        accessibilityRole="button"
        accessibilityLabel={appointment.locationName}
        className="active:opacity-70">
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {appointment.locationName}
          </Text>
          {appointment.isCanceled ? (
            <View className="rounded-full bg-line px-2.5 py-1">
              <Text className="text-xs font-semibold text-muted">{t('bookings.canceled')}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={16} color={brandColors.muted} />
          )}
        </View>
        <Text className="mt-1 text-sm capitalize text-muted">
          {dayLabel(appointment)} · {timeRangeLabel(appointment)}
        </Text>
        {appointment.locationCity ? (
          <Text className="mt-0.5 text-sm text-muted">{appointment.locationCity}</Text>
        ) : null}
        <View className="mt-3 border-t border-line pt-3">
          {appointment.services.map((service, index) => (
            <Text key={`${service}-${index}`} className="py-0.5 text-sm text-ink">
              {service}
            </Text>
          ))}
          <Text className="mt-2 text-sm font-semibold text-ink">{formatPrice(appointment.price)}</Text>
        </View>
      </Pressable>
      {upcoming ? (
        <View className="mt-3 border-t border-line pt-3">
          <Pressable
            onPress={onCancel}
            disabled={cancelPending}
            accessibilityRole="button"
            accessibilityLabel={t('bookings.cancel')}
            accessibilityState={{ busy: cancelPending }}
            className="self-start active:opacity-60">
            <Text className="text-sm font-semibold" style={{ color: '#C64A4A' }}>
              {cancelPending ? t('states.loading') : t('bookings.cancel')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
