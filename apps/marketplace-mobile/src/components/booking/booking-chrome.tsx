import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors } from '@/src/theme/colors';
import { t } from '@/src/i18n';

const BAR = 52;

/** Step header: optional back arrow, title, and an X that leaves the flow. */
export function BookingHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center bg-canvas px-4"
      style={{ paddingTop: insets.top, height: insets.top + BAR }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          className="h-11 w-11 items-center justify-center active:opacity-60">
          <Ionicons name="arrow-back" size={21} color={brandColors.navy} />
        </Pressable>
      ) : (
        <View className="w-3" />
      )}
      <Text numberOfLines={1} className="flex-1 text-[17px] font-semibold text-ink">
        {title}
      </Text>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('booking.close')}
        className="h-11 w-11 items-center justify-center active:opacity-60">
        <Ionicons name="close" size={24} color={brandColors.navy} />
      </Pressable>
    </View>
  );
}

/**
 * Sticky step footer: running total on the left, the step's action on the right.
 * `meta` carries the item count and duration; it is hidden while the cart is empty.
 */
export function BookingFooter({
  price,
  meta,
  label,
  onPress,
  disabled,
  busy,
  hint,
}: {
  price: string;
  meta?: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Shown instead of the total, for steps with nothing to sum yet. */
  hint?: string;
}) {
  const insets = useSafeAreaInsets();
  const blocked = disabled || busy;
  return (
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-canvas px-5 pt-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        boxShadow: '0 -1px 0 rgba(7,29,67,0.06)',
      }}>
      <View className="flex-1 pr-4">
        {hint ? (
          <Text className="text-sm text-muted">{hint}</Text>
        ) : (
          <>
            <Text className="text-lg font-bold text-ink">{price}</Text>
            {meta ? (
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <Ionicons name="cart-outline" size={14} color={brandColors.muted} />
                <Text className="text-sm text-muted">{meta}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
      <Pressable
        onPress={onPress}
        disabled={blocked}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: Boolean(blocked) }}
        className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-ink px-6 active:opacity-80"
        style={blocked ? { opacity: 0.35 } : undefined}>
        {busy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
        <Text className="text-base font-semibold text-white">{label}</Text>
        {busy ? null : <Ionicons name="arrow-forward" size={17} color="#ffffff" />}
      </Pressable>
    </View>
  );
}

export const BOOKING_BAR_HEIGHT = 12 + 48 + 12;
