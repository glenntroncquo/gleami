import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AvailabilityBucket, SearchItem } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { AvailabilityBadge } from '@/src/components/availability-badge';
import { MediaCarousel } from '@/src/components/media-carousel';
import { cityLine, formatCount } from '@/src/format';
import { useToggleLike } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';

type ResultCardProps = {
  item: SearchItem;
  availability?: AvailabilityBucket;
  availabilityLoading: boolean;
};

export function ResultCard({ item, availability, availabilityLoading }: ResultCardProps) {
  const { user } = useAuth();
  const likes = useToggleLike();
  const liked = likes.likedIds.has(item.locationId);
  const treatment = item.treatments[0]?.name;
  const place = cityLine(item.city, item.distanceKm);

  const open = () => {
    router.push({ pathname: '/salon/[slug]', params: { slug: item.slug } });
  };

  const onHeart = () => {
    if (!user) {
      router.push('/(tabs)/profile');
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    likes.toggle({ locationId: item.locationId, liked });
  };

  return (
    <View className="mb-8">
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={item.name}>
        <View className="overflow-hidden rounded-card bg-surface">
          <MediaCarousel images={item.imageUrl ? [item.imageUrl] : []} label={item.name} />
        </View>
        <View className="mt-3 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-ink">{item.name}</Text>
            {place ? <Text className="mt-0.5 text-sm text-muted">{place}</Text> : null}
            {treatment ? <Text className="mt-0.5 text-sm text-ink">{treatment}</Text> : null}
          </View>
        </View>
      </Pressable>
      <View className="mt-2 flex-row items-center justify-between">
        <AvailabilityBadge status={availability} loading={availabilityLoading && Boolean(item.treatments[0])} />
        <Pressable
          onPress={onHeart}
          accessibilityRole="button"
          accessibilityLabel={liked ? t('favorites.unlike') : t('favorites.like')}
          accessibilityState={{ selected: liked }}
          hitSlop={8}
          className="flex-row items-center gap-1 px-1 py-1">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#9f1239' : '#1c1917'} />
          <Text className="text-sm font-medium text-ink">{formatCount(item.likeCount)}</Text>
        </Pressable>
      </View>
    </View>
  );
}
