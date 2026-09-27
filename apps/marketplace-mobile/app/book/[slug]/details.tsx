import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createAppointment } from '@/src/api/booking';
import { useAuth } from '@/src/auth/auth-context';
import { isProfileReady } from '@/src/auth/profile-ready';
import { useBooking } from '@/src/booking/booking-context';
import { itemKey, itemLabel, totalMinutes, totalPrice } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { staffName } from '@/src/booking/slots';
import { BOOKING_BAR_HEIGHT, BookingFooter, BookingHeader } from '@/src/components/booking/booking-chrome';
import { BookingNoteSheet } from '@/src/components/booking/booking-note-sheet';
import { formatPrice } from '@/src/format';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { longDateLabel } from '@/src/lib/booking-date';
import { brandColors } from '@/src/theme/colors';

export default function BookingDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, loading } = useAuth();
  const location = useLocation(slug ?? '');
  const booking = useBooking();
  const insets = useSafeAreaInsets();
  const submitting = useRef(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const salon = location.data?.location;
  const slot = booking.slot;
  const ready = isProfileReady(user);
  const price = totalPrice(booking.items);
  const minutes = totalMinutes(booking.items);

  const openAccount = () => {
    if (loading || submitting.current) return;
    if (!user) router.push('/auth');
    else router.push({ pathname: '/auth/complete', params: { method: 'password' } });
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!salon || !slot || !isProfileReady(user)) throw new Error(t('booking.errors.generic'));
      return createAppointment({
        companyId: salon.companyId,
        locationId: salon.locationId,
        start: slot.available_start,
        staffId: slot.staff_id,
        services: booking.items.map((item) => ({
          serviceId: item.service.serviceId,
          serviceVariantId: item.variant.serviceVariantId,
          staffId: slot.staff_id,
        })),
        price,
        firstName: user.firstName.trim(),
        lastName: user.lastName.trim(),
        email: user.email,
        phone: user.phone.trim(),
        notes: booking.notes.trim(),
      });
    },
    onSuccess: (result) => {
      if (!slot || !booking.dayKey) return;
      booking.confirm({ bookingId: result.bookingId, dayKey: booking.dayKey, slot, items: booking.items, price });
      router.replace({ pathname: '/book/[slug]/confirmation', params: { slug: slug ?? '' } });
    },
    onError: (submitError) => {
      submitting.current = false;
      setError(submitError instanceof Error ? submitError.message : t('booking.errors.generic'));
    },
  });

  if (!slot || !booking.dayKey || booking.items.length === 0) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  const onSubmit = () => {
    if (loading || submitting.current) return;
    setError(null);
    if (!ready) {
      openAccount();
      return;
    }
    submitting.current = true;
    submit.mutate();
  };

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader title={t('booking.reviewTitle')}
        onBack={() => { if (!submitting.current) router.back(); }}
        onClose={() => { if (!submitting.current) closeBooking(slug ?? ''); }} />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: BOOKING_BAR_HEIGHT + insets.bottom + 32 }}>
        <View className="flex-row items-center gap-4 pb-6">
          {salon?.imageUrl ? (
            <Image source={{ uri: salon.imageUrl }} style={{ width: 64, height: 64, borderRadius: 16 }} contentFit="cover" />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-surface">
              <Ionicons name="storefront-outline" size={26} color={brandColors.navy} />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-ink">{salon?.name}</Text>
            <Text className="mt-1 text-sm text-muted">{[salon?.street, salon?.city].filter(Boolean).join(', ')}</Text>
          </View>
        </View>

        <View className="gap-4 pb-6">
          <SummaryLine icon="calendar-outline" label={longDateLabel(booking.dayKey)} />
          <SummaryLine icon="time-outline" label={`${slot.start_time} · ${t('salon.minutes', { count: minutes })}`} />
          {staffName(slot) ? <SummaryLine icon="person-outline" label={t('booking.withStaff', { name: staffName(slot) })} /> : null}
        </View>

        <View className="border-t border-line py-5" style={{ gap: 20 }}>
          {booking.items.map((item) => (
            <View key={itemKey(item)} className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-base text-ink">{itemLabel(item)}</Text>
                <Text className="mt-1 text-sm text-muted">{t('salon.minutes', { count: item.variant.durationMinutes })}</Text>
              </View>
              <Text className="text-base text-ink">{formatPrice(item.variant.price)}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row justify-between border-t border-line py-5">
          <Text className="text-lg font-semibold text-ink">{t('booking.total')}</Text>
          <Text className="text-lg font-semibold text-ink">{formatPrice(price)}</Text>
        </View>

        <View className="border-t border-line py-5">
          <Text accessibilityRole="header" className="mb-4 text-lg font-semibold text-ink">{t('booking.yourDetails')}</Text>
          <Pressable onPress={openAccount} disabled={submit.isPending || loading}
            accessibilityRole="button" accessibilityLabel={ready ? t('booking.editDetails') : user ? t('booking.completeDetails') : t('booking.signIn')}
            className="flex-row items-center gap-3 active:opacity-60">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-surface">
              <Ionicons name="person-outline" size={20} color={brandColors.navy} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-ink">
                {ready ? `${user.firstName} ${user.lastName}` : user ? t('booking.completeDetails') : t('booking.signInTitle')}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-muted">{user ? user.email : t('booking.signedOutDetails')}</Text>
              {ready ? <Text className="mt-0.5 text-sm text-muted">{user.phone}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={brandColors.muted} />
          </Pressable>
        </View>

        <Pressable onPress={() => setNoteOpen(true)} disabled={submit.isPending}
          accessibilityRole="button" accessibilityLabel={booking.notes ? t('booking.editNote') : t('booking.addNote')}
          className="flex-row items-center gap-3 border-t border-line py-5 active:opacity-60">
          <Ionicons name="chatbubble-outline" size={20} color={brandColors.navy} />
          <View className="flex-1">
            <Text className="text-base text-ink">{booking.notes ? t('booking.notes') : t('booking.addNote')}</Text>
            {booking.notes ? <Text numberOfLines={3} className="mt-1 text-sm leading-5 text-muted">{booking.notes}</Text> : null}
          </View>
          <Ionicons name={booking.notes ? 'chevron-forward' : 'add'} size={20} color={brandColors.muted} />
        </Pressable>
        {error ? <Text accessibilityRole="alert" className="mt-3 text-sm" style={{ color: '#D64545' }}>{error}</Text> : null}
      </ScrollView>

      <BookingFooter price={formatPrice(price)}
        meta={t(booking.items.length === 1 ? 'booking.cartOne' : 'booking.cartMany', { count: booking.items.length, minutes })}
        label={t('booking.confirm')} busy={submit.isPending || loading} onPress={onSubmit} />
      {noteOpen ? <BookingNoteSheet value={booking.notes} onClose={() => setNoteOpen(false)}
        onSave={(value) => { booking.setNotes(value); setNoteOpen(false); }} /> : null}
    </View>
  );
}

function SummaryLine({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={20} color={brandColors.navy} />
      <Text className="flex-1 text-base text-ink">{label}</Text>
    </View>
  );
}
