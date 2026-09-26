import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { galleryFromItem } from '@/src/api/gallery';
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
  compact?: boolean;
};

export function ResultCard({ item, availability, availabilityLoading, compact = false }: ResultCardProps) {
  const { user } = useAuth();
  const likes = useToggleLike();
  const liked = likes.likedIds.has(item.locationId);
  const treatment = item.treatments[0]?.name;
  const place = cityLine(item.city, item.distanceKm);
  const images = galleryFromItem(item.images, item.imageUrl);

  const open = () => {
    router.push({ pathname: '/salon/[slug]', params: { slug: item.slug } });
  };

  const onHeart = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    void Haptics.selectionAsync().catch(() => undefined);
    likes.toggle({ locationId: item.locationId, liked });
  };

  return (
    <View className={compact ? "mb-2" : "mb-7"}>
      <View className="overflow-hidden rounded-card bg-surface">
        <MediaCarousel images={images} label={item.name} height={compact ? 148 : 205} onPress={open} />
        <Pressable
          onPress={onHeart}
          accessibilityRole="button"
          accessibilityLabel={liked ? t('favorites.unlike') : t('favorites.like')}
          accessibilityState={{ selected: liked }}
          hitSlop={8}
          className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-white/90">
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? brandColors.navy : '#071D43'} />
        </Pressable>
      </View>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={item.name}>
        <View className="mt-3 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text numberOfLines={1} className="text-base font-semibold text-ink">{item.name}</Text>
            {item.rating != null && item.reviewCount > 0 ? <View className="mt-1 flex-row items-center gap-1"><Ionicons name="star" size={12} color="#FF934F" /><Text className="text-xs font-semibold text-ink">{item.rating.toFixed(1)}</Text><Text className="text-xs text-muted">({formatCount(item.reviewCount)})</Text></View> : null}
            {place ? <Text className="mt-0.5 text-sm text-muted">{place}</Text> : null}
            {treatment ? <Text className="mt-0.5 text-sm text-ink">{treatment}</Text> : null}
          </View>
        </View>
      </Pressable>
      <View className="mt-2 flex-row items-center justify-between">
        <AvailabilityBadge status={availability} loading={availabilityLoading && Boolean(item.treatments[0])} />

      </View>
    </View>
  );
}
