import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBooking } from '@/src/booking/booking-context';
import { itemKey, itemLabel, totalMinutes } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { staffName } from '@/src/booking/slots';
import { formatPrice } from '@/src/format';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { longDateLabel } from '@/src/lib/booking-date';
import { brandColors } from '@/src/theme/colors';

export default function BookingConfirmationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const location = useLocation(slug ?? '');
  const { confirmed } = useBooking();

  if (!confirmed) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 48,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}>
        <View className="items-center">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: brandColors.lavender }}>
            <Ionicons name="checkmark" size={34} color="#ffffff" />
          </View>
          <Text
            accessibilityRole="header"
            className="mt-5 text-center text-[26px] font-bold leading-8 tracking-tight text-ink">
            {t('booking.confirmedTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted">
            {t('booking.confirmedBody')}
          </Text>
        </View>

        <View className="mt-8 rounded-2xl bg-surface p-4">
          <Text className="text-base font-semibold text-ink">{location.data?.location.name}</Text>
          <Text className="mt-1 text-sm capitalize text-muted">
            {longDateLabel(confirmed.dayKey)} · {confirmed.slot.start_time}
          </Text>
          {staffName(confirmed.slot) ? (
            <Text className="mt-0.5 text-sm text-muted">
              {t('booking.withStaff', { name: staffName(confirmed.slot) })}
            </Text>
          ) : null}
          <View className="mt-4 border-t border-line pt-3">
            {confirmed.items.map((item) => (
              <View key={itemKey(item)} className="flex-row items-center justify-between py-1">
                <Text className="flex-1 pr-3 text-sm text-ink">{itemLabel(item)}</Text>
                <Text className="text-sm text-ink">{formatPrice(item.variant.price)}</Text>
              </View>
            ))}
            <View className="mt-2 flex-row items-center justify-between border-t border-line pt-3">
              <Text className="text-base font-semibold text-ink">{t('booking.total')}</Text>
              <Text className="text-base font-semibold text-ink">{formatPrice(confirmed.price)}</Text>
            </View>
            <Text className="mt-1 text-sm text-muted">
              {t('salon.minutes', { count: totalMinutes(confirmed.items) })}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <Pressable
          onPress={() => closeBooking(slug ?? '')}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-full bg-ink active:opacity-80">
          <Text className="text-base font-semibold text-white">{t('booking.done')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
