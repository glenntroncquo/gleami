import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createAppointment } from '@/src/api/booking';
import { isValidEmail, useAuth } from '@/src/auth/auth-context';
import { useBooking } from '@/src/booking/booking-context';
import { itemKey, itemLabel, totalMinutes, totalPrice } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import { staffName } from '@/src/booking/slots';
import {
  BOOKING_BAR_HEIGHT,
  BookingFooter,
  BookingHeader,
} from '@/src/components/booking/booking-chrome';
import { formatPrice } from '@/src/format';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { longDateLabel } from '@/src/lib/booking-date';
import { brandColors } from '@/src/theme/colors';

export default function BookingDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const location = useLocation(slug ?? '');
  const booking = useBooking();

  const [error, setError] = useState<string | null>(null);

  /**
   * The profile shows through until the user edits a field, so signing in from
   * this screen fills the form without overwriting anything already typed.
   */
  const { customer, setCustomer } = booking;
  const firstName = customer.firstName ?? user?.firstName ?? '';
  const lastName = customer.lastName ?? user?.lastName ?? '';
  const phone = customer.phone ?? user?.phone ?? '';

  const salon = location.data?.location;
  const slot = booking.slot;

  const submit = useMutation({
    mutationFn: async () => {
      if (!salon || !slot || !user) throw new Error('INCOMPLETE');
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
        price: totalPrice(booking.items),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: user.email,
        phone: phone.trim(),
        notes: booking.notes.trim(),
      });
    },
    onSuccess: (result) => {
      if (!slot || !booking.dayKey) return;
      booking.confirm({
        bookingId: result.bookingId,
        dayKey: booking.dayKey,
        slot,
        items: booking.items,
        price: totalPrice(booking.items),
      });
      router.replace({ pathname: '/book/[slug]/confirmation', params: { slug: slug ?? '' } });
    },
    onError: (submitError) => {
      setError(submitError instanceof Error ? submitError.message : t('booking.errors.generic'));
    },
  });

  if (!slot || !booking.dayKey || booking.items.length === 0) {
    return <Redirect href={{ pathname: '/book/[slug]', params: { slug: slug ?? '' } }} />;
  }

  const onSubmit = () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('booking.errors.nameRequired'));
      return;
    }
    if (!phone.trim()) {
      setError(t('booking.errors.phoneRequired'));
      return;
    }
    if (!user || !isValidEmail(user.email)) {
      setError(t('booking.errors.generic'));
      return;
    }
    submit.mutate();
  };

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader
        title={t('booking.yourDetails')}
        onBack={() => router.back()}
        onClose={() => closeBooking(slug ?? '')}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={-BOOKING_BAR_HEIGHT}>
        <ScrollView
          className="flex-1 bg-surface"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: BOOKING_BAR_HEIGHT + 40 }}>
          <View className="rounded-2xl bg-canvas p-4">
            <Text className="text-base font-semibold text-ink">{salon?.name}</Text>
            <Text className="mt-1 text-sm text-muted">
              {longDateLabel(booking.dayKey)} · {slot.start_time}
            </Text>
            {staffName(slot) ? (
              <Text className="mt-0.5 text-sm text-muted">{t('booking.withStaff', { name: staffName(slot) })}</Text>
            ) : null}
            <View className="mt-4 border-t border-line pt-3">
              {booking.items.map((item) => (
                <View key={itemKey(item)} className="flex-row items-center justify-between py-1">
                  <Text className="flex-1 pr-3 text-sm text-ink">{itemLabel(item)}</Text>
                  <Text className="text-sm text-ink">{formatPrice(item.variant.price)}</Text>
                </View>
              ))}
              <View className="mt-2 flex-row items-center justify-between border-t border-line pt-3">
                <Text className="text-base font-semibold text-ink">{t('booking.total')}</Text>
                <Text className="text-base font-semibold text-ink">
                  {formatPrice(totalPrice(booking.items))}
                </Text>
              </View>
              <Text className="mt-1 text-sm text-muted">
                {t('salon.minutes', { count: totalMinutes(booking.items) })}
              </Text>
            </View>
          </View>

          {user ? (
            <View className="mt-4 rounded-2xl bg-canvas p-4">
              <Text accessibilityRole="header" className="text-base font-semibold text-ink">
                {t('booking.yourDetails')}
              </Text>
              <Field
                label={t('booking.firstName')}
                value={firstName}
                onChange={(value) => setCustomer({ firstName: value })}
                autoComplete="given-name"
              />
              <Field
                label={t('booking.lastName')}
                value={lastName}
                onChange={(value) => setCustomer({ lastName: value })}
                autoComplete="family-name"
              />
              <Field
                label={t('booking.phone')}
                value={phone}
                onChange={(value) => setCustomer({ phone: value })}
                autoComplete="tel"
                keyboardType="phone-pad"
              />
              <View className="mt-3">
                <Text className="text-sm text-muted">{t('booking.email')}</Text>
                <Text className="mt-1 text-base text-ink">{user.email}</Text>
              </View>
              <Field
                label={t('booking.notes')}
                value={booking.notes}
                onChange={booking.setNotes}
                placeholder={t('booking.notesHint')}
                multiline
              />
            </View>
          ) : (
            <View className="mt-4 rounded-2xl bg-canvas p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="person-circle-outline" size={22} color={brandColors.navy} />
                <Text className="text-base font-semibold text-ink">{t('booking.signInTitle')}</Text>
              </View>
              <Text className="mt-2 text-sm leading-5 text-muted">{t('booking.signInBody')}</Text>
              <Pressable
                onPress={() => router.push('/auth')}
                accessibilityRole="button"
                className="mt-4 h-12 items-center justify-center rounded-full bg-ink active:opacity-80">
                <Text className="text-base font-semibold text-white">{t('booking.signIn')}</Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text className="mt-4 text-sm" style={{ color: brandColors.orange }}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <BookingFooter
        price={formatPrice(totalPrice(booking.items))}
        meta={t('booking.cartMany', {
          count: booking.items.length,
          minutes: totalMinutes(booking.items),
        })}
        hint={user ? undefined : t('booking.signInFirst')}
        label={t('booking.confirm')}
        disabled={!user}
        busy={submit.isPending}
        onPress={onSubmit}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  autoComplete,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoComplete?: 'given-name' | 'family-name' | 'tel';
  keyboardType?: 'phone-pad';
}) {
  return (
    <View className="mt-3">
      <Text className="text-sm text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={brandColors.muted}
        multiline={multiline}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        className="mt-1 rounded-xl border border-line px-3 text-base text-ink"
        style={{ height: multiline ? 88 : 46, paddingTop: multiline ? 12 : 0, textAlignVertical: multiline ? 'top' : 'center' }}
      />
    </View>
  );
}
