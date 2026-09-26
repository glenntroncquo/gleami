import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { MediaCarousel } from '@/src/components/media-carousel';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { SkeletonBlock } from '@/src/components/skeleton';
import { formatCount, formatPrice } from '@/src/format';
import { useLocation, useToggleLike } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { buildServiceBookingUrl } from '@/src/lib/booking-url';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

export default function SalonScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { user } = useAuth();
  const location = useLocation(slug ?? '');
  const likes = useToggleLike();
  const setCategory = useDiscovery((state) => state.setCategory);
  const data = location.data;
  const liked = data ? likes.likedIds.has(data.location.locationId) : false;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const book = async (serviceId: string, variantIds: string[]) => {
    if (!data) return;
    const url = buildServiceBookingUrl({
      companyId: data.location.companyId,
      locationId: data.location.locationId,
      serviceId,
      variantIds,
    });
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert(t('booking.failedTitle'), t('booking.failedBody'));
    }
  };

  const onHeart = () => {
    if (!data) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    likes.toggle({ locationId: data.location.locationId, liked });
  };

  return (
    <View className="flex-1 bg-canvas">
      {!online && !data ? (
        <View style={{ paddingTop: insets.top }}>
          <OfflineState onRetry={() => location.refetch()} />
        </View>
      ) : location.isLoading ? (
        <View style={{ paddingTop: insets.top + 64 }} className="px-5">
          <SkeletonBlock style={{ height: 240, borderRadius: 20 }} />
          <SkeletonBlock style={{ height: 24, width: '70%', marginTop: 16, borderRadius: 8 }} />
          <SkeletonBlock style={{ height: 16, width: '50%', marginTop: 10, borderRadius: 8 }} />
        </View>
      ) : location.isError || !data ? (
        <View style={{ paddingTop: insets.top + 24 }} className="px-5">
          <ErrorState onRetry={() => location.refetch()} />
          <Text className="mt-2 text-center text-sm text-muted">{t('salon.notFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}>
          <MediaCarousel
            images={data.location.images.length > 0 ? data.location.images : [data.location.imageUrl]}
            height={350}
            label={data.location.name}
          />
          <View className="rounded-t-3xl bg-canvas px-5 pt-5" style={{ marginTop: -22 }}>
            <Text className="text-2xl font-bold tracking-tight text-ink">{data.location.name}</Text>
            <Text className="mt-3 rounded-xl bg-surface px-3 py-3 text-sm text-muted">
              {data.location.street}, {data.location.postalCode} {data.location.city}
            </Text>
            <Text className="mt-1 text-sm text-muted">{t('salon.likes', { count: formatCount(data.location.likeCount) })}</Text>
            <View className="mt-4 flex-row flex-wrap gap-2">
              {data.categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => {
                    setCategory(category.id);
                    router.navigate('/discover');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  className="rounded-full bg-surface px-3 py-1.5">
                  <Text className="text-sm text-ink">{category.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text className="mt-6 text-lg font-semibold text-ink">{t('salon.about')}</Text>
            <Text className="mt-2 text-base leading-6 text-ink">{data.location.description}</Text>
            <Text className="mt-8 text-lg font-semibold text-ink">{t('salon.services')}</Text>
            {data.services.length === 0 ? (
              <Text className="mt-3 text-sm text-muted">{t('salon.emptyServices')}</Text>
            ) : (
              data.services.map((service) => (
                <View key={service.serviceId} className="mt-4 rounded-2xl border border-line bg-surface p-4">
                  <Text className="text-base font-semibold text-ink">{service.name}</Text>
                  {service.description ? (
                    <Text className="mt-1 text-sm leading-5 text-muted">{service.description}</Text>
                  ) : null}
                  <View className="mt-3 gap-2">
                    {service.variants.map((variant) => (
                      <View key={variant.serviceVariantId} className="flex-row items-center justify-between">
                        <Text className="flex-1 pr-3 text-sm text-ink">
                          {variant.name} · {t('salon.minutes', { count: variant.durationMinutes })}
                        </Text>
                        <Text className="text-sm font-semibold text-ink">{formatPrice(variant.price)}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => {
                      void book(
                        service.serviceId,
                        service.variants.map((variant) => variant.serviceVariantId),
                      );
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('salon.book')} ${service.name}`}
                    className="mt-4 items-center rounded-full bg-ink py-3">
                    <Text className="text-base font-semibold text-white">{t('salon.book')}</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
      <View className="absolute left-4" style={{ top: insets.top + 8 }}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <View className="rounded-full bg-white/90 p-1">
            <View className="h-10 w-10 items-center justify-center">
              <Ionicons name="chevron-back" size={22} color="#071D43" />
            </View>
          </View>
        </Pressable>
      </View>
      {data ? (
        <View className="absolute right-4" style={{ top: insets.top + 8 }}>
          <Pressable
            onPress={onHeart}
            accessibilityRole="button"
            accessibilityLabel={liked ? t('favorites.unlike') : t('favorites.like')}
            accessibilityState={{ selected: liked }}>
            <View className="rounded-full bg-white/90 p-1">
              <View className="h-10 flex-row items-center gap-1 px-3">
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? brandColors.navy : '#071D43'} />
                <Text className="text-sm font-semibold text-ink">{formatCount(data.location.likeCount)}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
