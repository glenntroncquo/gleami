import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenState } from '@/src/components/screen-state';
import { t } from '@/src/i18n';

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}>
      <Text className="px-5 text-3xl font-semibold tracking-tight text-ink">{t('bookings.title')}</Text>
      <View className="flex-1 justify-center">
        <ScreenState icon="calendar-outline" title={t('bookings.emptyTitle')} body={t('bookings.emptyBody')} />
      </View>
    </View>
  );
}
