import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AvailabilityDays } from '@/src/api/booking-types';
import { useBooking } from '@/src/booking/booking-context';
import { totalMinutes, totalPrice } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { mergeDaySlots } from '@/src/booking/slots';
import {
  BOOKING_BAR_HEIGHT,
  BookingFooter,
  BookingHeader,
} from '@/src/components/booking/booking-chrome';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { SkeletonBlock } from '@/src/components/skeleton';
import { formatPrice } from '@/src/format';
import { AVAILABILITY_WINDOW_DAYS, useAvailability } from '@/src/hooks/use-availability';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { addDays, dayKeysFrom, dayOfMonth, longDateLabel, monthLabel, today, weekdayLabel } from '@/src/lib/booking-date';
import { useOnline } from '@/src/lib/online';
import { brandColors } from '@/src/theme/colors';

/** Twelve weeks is further ahead than any salon publishes a schedule. */
const MAX_WEEKS = 12;
const WEEKS_PER_WINDOW = AVAILABILITY_WINDOW_DAYS / 7;

function firstOpenDay(days: AvailabilityDays | undefined): string | undefined {
  if (!days) return undefined;
  return Object.keys(days).sort().find((key) => mergeDaySlots(days[key]).length > 0);
}

function weekOf(allKeys: string[], key: string | undefined): number {
  const index = key ? allKeys.indexOf(key) : -1;
  return index < 0 ? 0 : Math.floor(index / 7);
}

export default function SelectTimeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const online = useOnline();
  const location = useLocation(slug ?? '');
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const listRef = useRef<ScrollView>(null);

  const base = useMemo(() => today(), []);
  const allKeys = useMemo(() => dayKeysFrom(base, MAX_WEEKS * 7), [base]);
  /** Null until the user pages: the strip then follows the first open day itself. */
  const [pagedWeek, setPagedWeek] = useState<number | null>(booking.dayKey ? weekOf(allKeys, booking.dayKey) : null);
  const [pickedDay, setPickedDay] = useState<string | null>(booking.dayKey);

  /**
   * One 28-day window at a time. Only explicit paging can leave it, so the
   * auto-picked week (always within the first four) never changes the request.
   */
  const availability = useAvailability({
    companyId: location.data?.location.companyId ?? '',
    locationId: location.data?.location.locationId ?? '',
    items: booking.items,
    windowStart: addDays(
      base,
      Math.floor((pagedWeek ?? 0) / WEEKS_PER_WINDOW) * AVAILABILITY_WINDOW_DAYS,
    ),
  });

  const days = availability.data;
  const weekOffset = pagedWeek ?? weekOf(allKeys, firstOpenDay(days));
  const weekKeys = allKeys.slice(weekOffset * 7, weekOffset * 7 + 7);
  /**
   * The highlighted day is always one of this week's open days: paging to
   * another week, or emptying a day by changing the cart, moves it along.
   */
  const selectedDay =
    pickedDay && weekKeys.includes(pickedDay) && mergeDaySlots(days?.[pickedDay]).length > 0
      ? pickedDay
      : (weekKeys.find((key) => mergeDaySlots(days?.[key]).length > 0) ?? null);
  const slots = mergeDaySlots(selectedDay ? days?.[selectedDay] : undefined);

  const validSelection = !availability.isError && !availability.isPending && booking.dayKey === selectedDay &&
    slots.some((entry) => entry.options.some((slot) => slot.available_start === booking.slot?.available_start && slot.staff_id === booking.slot?.staff_id));

  if (booking.items.length === 0) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  const monthKey = weekKeys[0] ?? allKeys[0]!;
  const atStart = weekOffset === 0;
  const atEnd = weekOffset >= MAX_WEEKS - 1;
  const page = (delta: number) => {
    setPagedWeek(Math.min(MAX_WEEKS - 1, Math.max(0, weekOffset + delta)));
    listRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader
        title={t('booking.selectTime')}
        onBack={() => router.back()}
        onClose={() => closeBooking(slug ?? '')}
      />

      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Text className="text-lg font-bold capitalize tracking-tight text-ink">{monthLabel(monthKey)}</Text>
        <View className="flex-row gap-1">
          <StepButton
            icon="chevron-back"
            disabled={atStart}
            label={t('booking.previousWeek')}
            onPress={() => page(-1)}
          />
          <StepButton
            icon="chevron-forward"
            disabled={atEnd}
            label={t('booking.nextWeek')}
            onPress={() => page(1)}
          />
        </View>
      </View>

      <Animated.View key={weekOffset} entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 22, gap: 8 }}>
          {weekKeys.map((key) => {
            const open = mergeDaySlots(days?.[key]).length > 0;
            const selected = selectedDay === key;
            return availability.isPending ? (
              <SkeletonBlock key={key} style={{ width: 62, height: 92, borderRadius: 16 }} />
            ) : (
              <Pressable key={key} disabled={!open} onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                setPickedDay(key);
                listRef.current?.scrollTo({ y: 0, animated: false });
              }} accessibilityRole="button" accessibilityLabel={longDateLabel(key)}
                accessibilityState={{ selected, disabled: !open }}
                style={({ pressed }) => ({ width: 62, height: 92, borderRadius: 16, borderWidth: 1,
                  borderColor: selected ? brandColors.lavender : brandColors.line,
                  backgroundColor: selected ? brandColors.lavender : '#ffffff',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: pressed ? 0.7 : open ? 1 : 0.35, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                <Text style={{ color: selected ? '#ffffff' : brandColors.muted, fontSize: 12 }}>{weekdayLabel(key)}</Text>
                <Text style={{ color: selected ? '#ffffff' : brandColors.navy, fontSize: 22, fontWeight: '600' }}>{dayOfMonth(key)}</Text>
                <Text style={{ color: selected ? '#ffffff' : brandColors.muted, fontSize: 12 }}>{monthLabel(key).split(' ')[0].slice(0, 3)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      <ScrollView
        ref={listRef}
        className="flex-1 bg-canvas"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: BOOKING_BAR_HEIGHT + insets.bottom + 24 }}>
        {!online && !days ? (
          <OfflineState onRetry={() => availability.refetch()} />
        ) : availability.isPending ? (
          <SlotSkeleton />
        ) : availability.isError ? (
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

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
      style={disabled ? { opacity: 0.3 } : undefined}>
      <Ionicons name={icon} size={20} color={brandColors.navy} />
    </Pressable>
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
