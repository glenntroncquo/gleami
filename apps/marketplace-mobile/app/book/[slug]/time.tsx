import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '@/src/booking/booking-context';
import { totalMinutes, totalPrice } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { mergeDaySlots } from '@/src/booking/slots';
import {
  BOOKING_BAR_HEIGHT,
  BookingFooter,
  BookingHeader,
} from '@/src/components/booking/booking-chrome';
import { DayStrip, type DayStripHandle } from '@/src/components/booking/day-strip';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { SkeletonBlock } from '@/src/components/skeleton';
import { formatPrice } from '@/src/format';
import { AVAILABILITY_WINDOW_DAYS, useAvailabilityWindows } from '@/src/hooks/use-availability';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { dayKeysFrom, longDateLabel, monthLabel, today } from '@/src/lib/booking-date';
import { useOnline } from '@/src/lib/online';
import { brandColors } from '@/src/theme/colors';

/** Three windows: twelve weeks is further ahead than any salon publishes a schedule. */
const DAY_COUNT = 3 * AVAILABILITY_WINDOW_DAYS;
/** Chips visible beside the leading one, so a settled strip fetches what it shows. */
const VISIBLE_DAYS = 6;

/** The window the leading day sits in, plus the next one when the strip straddles a boundary. */
function windowsFor(lead: number): number[] {
  const first = Math.floor(lead / AVAILABILITY_WINDOW_DAYS);
  const last = Math.floor(Math.min(DAY_COUNT - 1, lead + VISIBLE_DAYS) / AVAILABILITY_WINDOW_DAYS);
  return first === last ? [first] : [first, last];
}

export default function SelectTimeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const online = useOnline();
  const location = useLocation(slug ?? '');
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const listRef = useRef<ScrollView>(null);
  const stripRef = useRef<DayStripHandle>(null);
  const centred = useRef(false);

  const base = useMemo(() => today(), []);
  const dayKeys = useMemo(() => dayKeysFrom(base, DAY_COUNT), [base]);
  const [monthKey, setMonthKey] = useState(dayKeys[0]!);
  const [pickedDay, setPickedDay] = useState<string | null>(booking.dayKey);
  /**
   * Grows as the user scrolls into new windows and never shrinks: a window that
   * was already fetched should not fall back to skeletons on the way back.
   */
  const [windows, setWindows] = useState(() => windowsFor(Math.max(0, dayKeys.indexOf(booking.dayKey ?? ''))));

  /** The only place a request is started: the strip calls this once scrolling stops. */
  const onSettle = useCallback((lead: number) => {
    setWindows((current) => {
      const added = windowsFor(lead).filter((window) => !current.includes(window));
      return added.length === 0 ? current : [...current, ...added].sort((a, b) => a - b);
    });
  }, []);

  const availability = useAvailabilityWindows({
    companyId: location.data?.location.companyId ?? '',
    locationId: location.data?.location.locationId ?? '',
    items: booking.items,
    base,
    windows,
  });

  const days = availability.days;
  const openKeys = useMemo(
    () => new Set(Object.keys(days).filter((key) => mergeDaySlots(days[key]).length > 0)),
    [days],
  );

  /**
   * Scrolling never moves the highlight: only a tap does. It shifts on its own
   * only when the picked day has no slots left, after a change to the cart.
   */
  const selectedDay =
    pickedDay && openKeys.has(pickedDay) ? pickedDay : (dayKeys.find((key) => openKeys.has(key)) ?? null);
  const slots = mergeDaySlots(selectedDay ? days[selectedDay] : undefined);

  /** Bring the first open day into view once, in case the salon is booked out for weeks. */
  useEffect(() => {
    if (centred.current || !selectedDay) return;
    centred.current = true;
    if (dayKeys.indexOf(selectedDay) <= 0) return;
    stripRef.current?.scrollToDay(selectedDay);
  }, [dayKeys, selectedDay]);

  const selectDay = useCallback((key: string) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setPickedDay(key);
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  /** Loaded slots are proof enough: a pending or failed window leaves `slots` empty. */
  const validSelection = booking.dayKey === selectedDay &&
    slots.some((entry) => entry.options.some((slot) => slot.available_start === booking.slot?.available_start && slot.staff_id === booking.slot?.staff_id));

  if (booking.items.length === 0) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader
        title={t('booking.selectTime')}
        onBack={() => router.back()}
        onClose={() => closeBooking(slug ?? '')}
      />

      <View className="px-5 pb-3 pt-1">
        <Text className="text-lg font-bold capitalize tracking-tight text-ink">{monthLabel(monthKey)}</Text>
      </View>

      <DayStrip
        ref={stripRef}
        dayKeys={dayKeys}
        openKeys={openKeys}
        settledWindows={availability.settled}
        windowDays={AVAILABILITY_WINDOW_DAYS}
        selected={selectedDay}
        onSelect={selectDay}
        onSettle={onSettle}
        onMonthChange={setMonthKey}
      />

      <ScrollView
        ref={listRef}
        className="flex-1 bg-canvas"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: BOOKING_BAR_HEIGHT + insets.bottom + 24 }}>
        {!online && availability.loaded.size === 0 ? (
          <OfflineState onRetry={() => availability.refetch()} />
        ) : !selectedDay && availability.isPending ? (
          <SlotSkeleton />
        ) : !selectedDay && availability.isError ? (
          online ? (
            <ErrorState onRetry={() => availability.refetch()} />
          ) : (
            <OfflineState onRetry={() => availability.refetch()} />
          )
        ) : slots.length === 0 ? (
          <Text className="pt-6 text-center text-sm text-muted">{t('booking.noTimes')}</Text>
        ) : (
          <Animated.View key={selectedDay} entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)} style={{ gap: 10 }}>
            <Text accessibilityRole="header" className="mb-2 text-base font-semibold capitalize text-ink">{selectedDay ? longDateLabel(selectedDay) : ''}</Text>
            {slots.map((slot) => {
              const selected = validSelection && booking.slot?.available_start === slot.options[0]!.available_start;
              return (
                <Pressable
                  key={slot.time}
                  onPress={() => {
                    if (!selectedDay) return;
                    void Haptics.selectionAsync().catch(() => undefined);
                    booking.chooseSlot(selectedDay, slot.options[0]!);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, checked: selected }}
                  className="flex-row items-center justify-between rounded-xl px-4 active:opacity-70"
                  style={{
                    width: '100%',
                    height: 56,
                    backgroundColor: selected ? '#F5F3FF' : '#ffffff',
                    borderWidth: selected ? 1.5 : 1,
                    borderColor: selected ? brandColors.lavender : brandColors.line,
                  }}>
                  <Text className="text-[15px] font-semibold text-ink">{slot.time}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={21} color={brandColors.lavender} /> : null}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>

      <BookingFooter
        price={formatPrice(totalPrice(booking.items))}
        meta={t(booking.items.length === 1 ? 'booking.cartOne' : 'booking.cartMany', {
          count: booking.items.length,
          minutes: totalMinutes(booking.items),
        })}
        label={t('booking.continue')}
        disabled={!validSelection}
        onPress={() => validSelection && router.push({ pathname: '/book/[slug]/details', params: { slug: slug ?? '' } })}
      />
    </View>
  );
}

function SlotSkeleton() {
  return (
    <View style={{ gap: 10 }} accessibilityRole="progressbar" accessibilityLabel={t('states.loading')}>
      <SkeletonBlock style={{ width: 170, height: 20, borderRadius: 8, marginBottom: 8 }} />
      {Array.from({ length: 9 }, (_, index) => (
        <SkeletonBlock key={index} style={{ width: '100%', height: 56, borderRadius: 12 }} />
      ))}
    </View>
  );
}
