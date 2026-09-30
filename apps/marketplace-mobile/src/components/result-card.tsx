import { AnimatedHeart } from '@/src/components/animated-heart';
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { galleryFromItem } from "@/src/api/gallery";
import type { AvailabilityBucket, SearchItem } from "@/src/api/types";
import { useAuth } from "@/src/auth/auth-context";
import { AvailabilityBadge } from "@/src/components/availability-badge";
import { MediaCarousel } from "@/src/components/media-carousel";
import { formatCount, formatDistance } from "@/src/format";
import { useToggleLike } from "@/src/hooks/use-marketplace";
import { t } from "@/src/i18n";

type ResultCardProps = {
  item: SearchItem;
  availability?: AvailabilityBucket;
  availabilityLoading: boolean;
  compact?: boolean;
};

export const ResultCard = React.memo(function ResultCard({
  item,
  availability,
  availabilityLoading,
  compact = false,
}: ResultCardProps) {
  const { user } = useAuth();
  const likes = useToggleLike();
  const liked = likes.likedIds.has(item.locationId);
  const distance = formatDistance(item.distanceKm);
  const images = galleryFromItem(item.images, item.imageUrl);

  const open = () => {
    router.push({ pathname: "/salon/[slug]", params: { slug: item.slug } });
  };

  const onHeart = () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    likes.toggle({ locationId: item.locationId, liked });
  };

  return (
    <View className={compact ? "mb-2" : "mb-7"}>
      <View className="overflow-hidden rounded-card bg-surface">
        <MediaCarousel
          images={images}
          label={item.name}
          height={compact ? 148 : 205}
          onPress={open}
        />
        <Pressable
          onPress={onHeart}
          accessibilityRole="button"
          accessibilityLabel={
            liked ? t("favorites.unlike") : t("favorites.like")
          }
          accessibilityState={{ selected: liked }}
          hitSlop={8}
          className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-white/90"
        >
          <AnimatedHeart liked={liked} />
        </Pressable>
      </View>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View className="mt-3 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              numberOfLines={1}
              className="text-base font-semibold text-ink"
            >
              {item.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
                <Ionicons name="star" size={15} color="#F5B400" />
                <Text className="text-sm font-semibold text-ink">{item.rating != null ? item.rating.toFixed(1).replace('.', ',') : '—'}</Text>
                <Text className="text-sm text-muted">({formatCount(item.reviewCount)})</Text>
                {distance ? <Text className="text-sm text-muted">·</Text> : null}
                {distance ? <Text className="text-sm text-muted">{distance}</Text> : null}
            </View>
            {item.city ? <Text numberOfLines={1} className="mt-0.5 text-sm text-muted">{item.city}</Text> : null}
          </View>
        </View>
      </Pressable>
      <View className="mt-2 flex-row items-center justify-between">
        <AvailabilityBadge
          status={availability}
          loading={availabilityLoading && Boolean(item.treatments[0])}
        />
      </View>
    </View>
  );
});
