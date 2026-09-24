import React from 'react';
import { Text, View } from 'react-native';

import type { AvailabilityBucket } from '@/src/api/types';
import { t } from '@/src/i18n';
import { SkeletonBlock } from '@/src/components/skeleton';

const LABELS: Record<Exclude<AvailabilityBucket, 'none_soon'>, string> = {
  today: 'availability.today',
  tomorrow: 'availability.tomorrow',
  this_week: 'availability.this_week',
};

export function AvailabilityBadge({
  status,
  loading,
}: {
  status?: AvailabilityBucket;
  loading: boolean;
}) {
  if (loading) {
    return <SkeletonBlock style={{ height: 24, width: 148, borderRadius: 999, marginTop: 8 }} />;
  }
  if (!status || status === 'none_soon') return null;
  const label = t(LABELS[status]);
  return (
    <View
      className="mt-2 self-start rounded-full bg-accent-soft px-2.5 py-1"
      accessibilityRole="text"
      accessibilityLabel={label}>
      <Text className="text-xs font-semibold text-accent">{label}</Text>
    </View>
  );
}
