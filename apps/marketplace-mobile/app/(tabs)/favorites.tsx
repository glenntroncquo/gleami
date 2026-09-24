import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FavoriteSalon } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { ExampleBanner } from '@/src/components/example-banner';
import { ErrorState, OfflineState, ScreenState } from '@/src/components/screen-state';
import { SkeletonBlock } from '@/src/components/skeleton';
import { formatCount } from '@/src/format';
import { useFavorites, useToggleLike } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const online = useOnline();
  const favorites = useFavorites();
  const likes = useToggleLike();

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 }}>
      <Text className="px-5 text-3xl font-semibold tracking-tight text-ink">{t('favorites.title')}</Text>
      <View className="mt-3">
        <ExampleBanner />
      </View>
      {!user ? (
        <View className="flex-1 justify-center">
          <ScreenState
            icon="heart-outline"
            title={t('favorites.signInTitle')}
            body={t('favorites.signInBody')}
            actionLabel={t('favorites.signIn')}
            onAction={() => router.push('/(tabs)/profile')}
          />
        </View>
      ) : !online && !favorites.data ? (
        <OfflineState onRetry={() => favorites.refetch()} />
      ) : favorites.isLoading ? (
        <View className="gap-4 px-5 pt-2">
          <SkeletonBlock style={{ height: 88, borderRadius: 20 }} />
          <SkeletonBlock style={{ height: 88, borderRadius: 20 }} />
        </View>
      ) : favorites.isError ? (
        <ErrorState onRetry={() => favorites.refetch()} />
      ) : (
        <FlatList
          data={favorites.data ?? []}
          keyExtractor={(item) => item.locationId}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 }}
          refreshing={favorites.isRefetching}
          onRefresh={() => {
            void favorites.refetch();
          }}
          ListEmptyComponent={
            <ScreenState
              icon="heart-outline"
              title={t('favorites.emptyTitle')}
              body={t('favorites.emptyBody')}
              actionLabel={t('favorites.discover')}
              onAction={() => router.push('/(tabs)')}
            />
          }
          renderItem={({ item }) => (
            <FavoriteRow
              item={item}
              liked={likes.likedIds.has(item.locationId)}
              onUnlike={() => likes.toggle({ locationId: item.locationId, liked: true })}
            />
          )}
        />
      )}
    </View>
  );
}

function FavoriteRow({
  item,
  liked,
  onUnlike,
}: {
  item: FavoriteSalon;
  liked: boolean;
  onUnlike: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-3 rounded-card bg-surface p-2">
      <Pressable
        onPress={() => router.push({ pathname: '/salon/[slug]', params: { slug: item.slug } })}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        className="flex-1 flex-row items-center gap-3">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ width: 72, height: 72, borderRadius: 16 }} contentFit="cover" />
        ) : (
          <View className="h-[72px] w-[72px] rounded-2xl bg-line" />
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">{item.name}</Text>
          {item.city ? <Text className="mt-0.5 text-sm text-muted">{item.city}</Text> : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onUnlike}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.unlike')}
        accessibilityState={{ selected: liked }}
        className="flex-row items-center gap-1 px-2 py-2">
        <Ionicons name="heart" size={18} color="#9f1239" />
        <Text className="text-sm text-ink">{formatCount(item.likeCount)}</Text>
      </Pressable>
    </View>
  );
}
