import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

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
import { addDays, dayKeysFrom, dayOfMonth, monthLabel, today, weekdayLabel } from '@/src/lib/booking-date';
import { useOnline } from '@/src/lib/online';
import { brandColors } from '@/src/theme/colors';

/** Twelve weeks is further ahead than any salon publishes a schedule. */
const MAX_WEEKS = 12;
const WEEKS_PER_WINDOW = AVAILABILITY_WINDOW_DAYS / 7;

function firstOpenDay(days: AvailabilityDays | undefined): string | undefined {
  if (!days) return undefined;
  return Object.keys(days).sort()[0];
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

  const base = useMemo(() => today(), []);
  const allKeys = useMemo(() => dayKeysFrom(base, MAX_WEEKS * 7), [base]);
  /** Null until the user pages: the strip then follows the first open day itself. */
  const [pagedWeek, setPagedWeek] = useState<number | null>(null);
  const [pickedDay, setPickedDay] = useState<string | null>(null);

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
    pickedDay && weekKeys.includes(pickedDay) && days?.[pickedDay]
      ? pickedDay
      : (weekKeys.find((key) => days?.[key]) ?? null);
  const slots = mergeDaySlots(selectedDay ? days?.[selectedDay] : undefined);

  if (booking.items.length === 0) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  const monthKey = weekKeys[0] ?? allKeys[0]!;
  const atStart = weekOffset === 0;
  const atEnd = weekOffset >= MAX_WEEKS - 1;
  const page = (delta: number) =>
    setPagedWeek(Math.min(MAX_WEEKS - 1, Math.max(0, weekOffset + delta)));

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader
        title={t('booking.selectTime')}
        onBack={() => router.back()}
        onClose={() => closeBooking(slug ?? '')}
      />

      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
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

      <View className="flex-row px-3 pb-3 pt-1">
        {weekKeys.map((key) => {
          const open = Boolean(days?.[key]);
          const selected = selectedDay === key;
          return (
            <Pressable
              key={key}
              disabled={!open}
              onPress={() => {
                void Haptics.selectionAsync().catch(() => undefined);
                setPickedDay(key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !open }}
              className="flex-1 items-center py-1 active:opacity-60">
              <Text className="text-xs text-muted">{weekdayLabel(key)}</Text>
              <View
                className="mt-1 h-9 w-9 items-center justify-center rounded-full"
                style={selected ? { backgroundColor: brandColors.navy } : undefined}>
                <Text
                  className={
                    selected
                      ? 'text-[15px] font-semibold text-white'
                      : open
                        ? 'text-[15px] font-semibold text-ink'
                        : 'text-[15px] text-muted'
                  }
                  style={open ? undefined : { opacity: 0.4 }}>
                  {dayOfMonth(key)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        className="flex-1 bg-surface"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: BOOKING_BAR_HEIGHT + 40 }}>
        {availability.isLoading ? (
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
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {slots.map((slot) => {
              const selected = booking.slot?.available_start === slot.options[0]!.available_start;
              return (
                <Pressable
                  key={slot.time}
                  onPress={() => {
                    if (!selectedDay) return;
                    void Haptics.selectionAsync().catch(() => undefined);
                    booking.chooseSlot(selectedDay, slot.options[0]!);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  className="items-center justify-center rounded-xl bg-canvas active:opacity-80"
                  style={{
                    width: '31%',
                    height: 46,
                    borderWidth: 2,
                    borderColor: selected ? brandColors.lavender : brandColors.line,
                  }}>
                  <Text className="text-[15px] font-semibold text-ink">{slot.time}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BookingFooter
        price={formatPrice(totalPrice(booking.items))}
        meta={t('booking.cartMany', {
          count: booking.items.length,
          minutes: totalMinutes(booking.items),
        })}
        hint={booking.slot ? undefined : t('booking.pickTime')}
        label={t('booking.continue')}
        disabled={!booking.slot}
        onPress={() => router.push({ pathname: '/book/[slug]/details', params: { slug: slug ?? '' } })}
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
      className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
      style={disabled ? { opacity: 0.3 } : undefined}>
      <Ionicons name={icon} size={20} color={brandColors.navy} />
    </Pressable>
  );
}

function SlotSkeleton() {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }} accessibilityElementsHidden>
      {Array.from({ length: 9 }, (_, index) => (
        <SkeletonBlock key={index} style={{ width: '31%', height: 46, borderRadius: 12 }} />
      ))}
    </View>
  );
}
