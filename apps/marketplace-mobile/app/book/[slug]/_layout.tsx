import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { BookingProvider } from '@/src/booking/booking-context';
import { findItem } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { BookingHeader } from '@/src/components/booking/booking-chrome';
import { BookingSkeleton } from '@/src/components/booking/booking-skeleton';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';


/**
 * Holds the draft for the whole flow. The salon is loaded here because the
 * provider needs a preselected service at mount; every step then reads the same
 * cached query. Usually there is nothing to wait for — the salon page just
 * filled that cache.
 */
export default function BookingLayout() {
  const { slug, variantId } = useLocalSearchParams<{ slug: string; variantId?: string }>();
  const online = useOnline();
  const location = useLocation(slug ?? '');

  if (location.isLoading) return <BookingSkeleton />;

  if (!location.data) {
    return (
      <View className="flex-1 bg-canvas">
        <BookingHeader title={t('booking.title')} onClose={() => closeBooking(slug ?? '')} />
        <View>
          {online ? (
            <ErrorState onRetry={() => location.refetch()} />
          ) : (
            <OfflineState onRetry={() => location.refetch()} />
          )}
          <Text className="mt-2 text-center text-sm text-muted">{t('salon.notFound')}</Text>
        </View>
      </View>
    );
  }

  const preselected = variantId ? findItem(location.data.services, variantId) : null;

  return (
    <BookingProvider initialItems={preselected ? [preselected] : []}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#ffffff' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="time" />
        <Stack.Screen name="details" />
        <Stack.Screen name="confirmation" options={{ gestureEnabled: false }} />
      </Stack>
    </BookingProvider>
  );
}
