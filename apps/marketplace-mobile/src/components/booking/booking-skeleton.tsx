import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOOKING_BAR_HEIGHT } from '@/src/components/booking/booking-chrome';
import { SkeletonBlock, SkeletonText } from '@/src/components/skeleton';
import { t } from '@/src/i18n';

/** Mirrors the service picker: header, chip row, and four cards on the grey list. */
export function BookingSkeleton() {
  const insets = useSafeAreaInsets();
  const chipWidths = [104, 128, 72, 86];
  return (
    <View
      className="flex-1 bg-canvas"
      accessibilityLabel={t('states.loading')}
      accessibilityRole="progressbar">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5">
        <SkeletonText lineHeight={44} size={18} width="52%" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden' }}>
        {chipWidths.map((width) => (
          <SkeletonBlock key={width} style={{ height: 40, width, borderRadius: 20 }} />
        ))}
      </View>
      <View className="flex-1 bg-surface px-5 pt-5">
        <SkeletonText lineHeight={28} size={15} width={120} />
        <View className="mt-3">
          {[0, 1, 2, 3].map((index) => (
            <SkeletonBlock key={index} style={{ height: 116, borderRadius: 16, marginBottom: 12 }} />
          ))}
        </View>
      </View>
      <View
        className="absolute bottom-0 left-0 right-0 bg-canvas"
        style={{ height: BOOKING_BAR_HEIGHT + Math.max(insets.bottom, 12) }}
      />
    </View>
  );
}
