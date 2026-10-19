import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { galleryFromItem } from '@/src/api/gallery';
import type { SearchItem } from '@/src/api/types';
import { MediaCarousel } from '@/src/components/media-carousel';
import { formatCount, formatDistance } from '@/src/format';
import { useCategories } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';

const shadow = {
  shadowColor: '#071D43',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 18,
  elevation: 8,
} as const;

export function MapSalonCard({ item, onClose }: { item: SearchItem; onClose: () => void }) {
  const categories = useCategories();
  const images = galleryFromItem(item.images, item.imageUrl);
  const distance = formatDistance(item.distanceKm);
  const place = [distance, item.city].filter(Boolean).join(' · ');
  const categoryName =
    categories.data?.find((category) => item.categoryIds.includes(category.id))?.name ??
    item.treatments[0]?.name;
  const reviews =
    item.reviewCount > 0
      ? t(item.reviewCount === 1 ? 'discover.review' : 'discover.reviews', {
          count: formatCount(item.reviewCount),
        })
      : null;
  const detail = [categoryName, reviews].filter(Boolean).join(' · ');
  const rating = item.rating != null ? item.rating.toFixed(1).replace('.', ',') : '—';

  const open = () => {
    router.push({ pathname: '/salon/[slug]', params: { slug: item.slug } });
  };

  return (
    <View className="rounded-[22px] bg-white" style={shadow}>
      <View className="overflow-hidden rounded-[22px]">
        <View>
          <MediaCarousel images={images} label={item.name} height={168} onPress={open} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discover.closeMapCard')}
            onPress={onClose}
            hitSlop={8}
            className="absolute right-2.5 top-2.5 h-8 w-8 items-center justify-center rounded-full bg-white/95">
            <Ionicons name="close" size={18} color="#071D43" />
          </Pressable>
        </View>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={item.name} className="px-4 pb-4 pt-3">
          <View className="flex-row items-start justify-between gap-3">
            <Text numberOfLines={1} className="flex-1 text-lg font-semibold text-ink">
              {item.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Ionicons name="star" size={15} color="#F5B400" />
              <Text className="text-sm font-semibold text-ink">{rating}</Text>
            </View>
          </View>
          {place ? (
            <Text numberOfLines={1} className="mt-1 text-sm text-muted">
              {place}
            </Text>
          ) : null}
          {detail ? (
            <Text numberOfLines={1} className="mt-0.5 text-sm text-muted">
              {detail}
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
