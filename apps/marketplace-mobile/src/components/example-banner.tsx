import React from 'react';
import { Text, View } from 'react-native';

import { useMocks } from '@/src/config';
import { t } from '@/src/i18n';

export function ExampleBanner() {
  if (!useMocks) return null;
  return (
    <View
      className="mx-5 mb-3 rounded-full bg-accent-soft px-3 py-2"
      accessibilityRole="text"
      accessibilityLabel={t('discover.exampleBanner')}>
      <Text className="text-center text-xs font-semibold text-accent">{t('discover.exampleBanner')}</Text>
    </View>
  );
}
