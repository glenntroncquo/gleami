import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useCheckout } from '@/contexts/checkout-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CheckoutLineItem,
  CheckoutPaymentType,
  checkoutLineItems,
  createOrderWithPayment,
  fetchAppointmentForCheckout,
} from '@/lib/api/checkout';

const PAYMENT_TYPES: CheckoutPaymentType[] = ['cash', 'card', 'invoice', 'bank_transfer'];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { appointment: preparedAppointment } = useCheckout();
  const initialAppointment = preparedAppointment?.id === appointmentId ? preparedAppointment : null;
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [loading, setLoading] = React.useState(!initialAppointment);
  const [error, setError] = React.useState<string | null>(null);
  const [clientName, setClientName] = React.useState(() => initialAppointment
    ? `${initialAppointment.client?.first_name ?? ''} ${initialAppointment.client?.last_name ?? ''}`.trim() || t('calendar.unknownClient')
    : '');
  const [clientId, setClientId] = React.useState<string | null>(initialAppointment?.client_id ?? null);
  const [lineItems, setLineItems] = React.useState<CheckoutLineItem[]>(() => initialAppointment ? checkoutLineItems(initialAppointment) : []);

  const [paymentType, setPaymentType] = React.useState<CheckoutPaymentType>('bank_transfer');
  const [amount, setAmount] = React.useState(() => initialAppointment
    ? checkoutLineItems(initialAppointment).reduce((sum, item) => sum + item.price, 0).toFixed(2)
    : '');
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [orderNumber, setOrderNumber] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    // Appointment detail supplies these services just as the website does.
    // Fetch only for direct entry from the day sheet or a deep link.
    const request = initialAppointment
      ? Promise.resolve(initialAppointment)
      : fetchAppointmentForCheckout(appointmentId);
    let active = true;
    request
      .then((appointment) => {
        if (!active) return;
        if (!appointment) {
          setError(t('checkout.failedToLoad'));
          return;
        }
        const items = checkoutLineItems(appointment);
        setLineItems(items);
        setClientId(appointment.client_id);
        setClientName(
          `${appointment.client?.first_name ?? ''} ${appointment.client?.last_name ?? ''}`.trim() ||
            t('calendar.unknownClient')
        );
        const total = items.reduce((sum, item) => sum + item.price, 0);
        setAmount(total.toFixed(2));
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t('checkout.failedToLoad'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [appointmentId, initialAppointment, t]);

  const total = lineItems.reduce((sum, item) => sum + item.price, 0);
  const amountValue = Number(amount);
  const canSubmit = lineItems.length > 0 && Number.isFinite(amountValue) && amountValue >= 0 && !submitting;

  const handleComplete = async () => {
    if (!companyId || !appointmentId || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrderWithPayment({
        companyId,
        locationId: locationId ?? undefined,
        appointmentId,
        clientId: clientId ?? undefined,
        lineItems,
        paymentType,
        amount: amountValue,
      });
      setOrderNumber(result.order_number ?? null);
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failedToComplete'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <Stack.Screen
        options={{
          headerShown: true,
          title: t('checkout.title'),
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {header}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {header}
        <View style={styles.successContainer}>
          <AppIcon name="checkCircle" size={64} color={theme.tint} />
          <Text style={styles.successTitle}>{t('checkout.success')}</Text>
          {orderNumber ? <Text style={styles.successSubtitle}>{orderNumber}</Text> : null}
          <Pressable style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>{t('checkout.done')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      {header}


      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('client.title')}</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.services')}</Text>
          {lineItems.length === 0 ? (
            <EmptyState
              compact
              title={t('checkout.noLineItems')}
              subtitle={t('checkout.noLineItemsHint')}
            />
          ) : (
            lineItems.map((item, index) => (
              <View key={`${item.appointmentSegmentId}-${index}`} style={styles.lineItemRow}>
                <Text style={styles.lineItemName}>{item.name}</Text>
                <Text style={styles.lineItemPrice}>{`€${item.price.toFixed(2)}`}</Text>
              </View>
            ))
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('checkout.total')}</Text>
            <Text style={styles.totalValue}>{`€${total.toFixed(2)}`}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('checkout.paymentMethod')}</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_TYPES.map((type) => {
              const isSelected = paymentType === type;
              return (
                <Pressable
                  key={type}
                  style={[styles.paymentChip, isSelected && styles.paymentChipActive]}
                  onPress={() => setPaymentType(type)}>
                  <Text style={[styles.paymentChipText, isSelected && styles.paymentChipTextActive]}>
                    {t(`checkout.paymentTypes.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('checkout.amount')}</Text>
          <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.completeButton, !canSubmit && styles.completeButtonDisabled]} onPress={handleComplete} disabled={!canSubmit}>
          {submitting ? (
            <ActivityIndicator size="small" color={theme.onTint} />
          ) : (
            <Text style={styles.completeButtonText}>{t('checkout.complete')}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: Design.controlRadius,
      backgroundColor: theme.errorSurface,
    },
    errorBannerText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '600',
    },
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 24,
      gap: 24,
    },
    section: {
      gap: 10,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
    },
    clientName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
    },
    lineItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    lineItemName: {
      fontSize: 15,
      color: theme.text,
    },
    lineItemPrice: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
    },
    totalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    paymentRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    paymentChip: {
      minHeight: Design.touchTarget,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
    },
    paymentChipActive: {
      backgroundColor: theme.tint,
      borderColor: theme.tint,
    },
    paymentChipText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    paymentChipTextActive: {
      color: theme.onTint,
    },
    input: {
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
    },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    completeButton: {
      backgroundColor: theme.tint,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    completeButtonDisabled: {
      backgroundColor: theme.border,
    },
    completeButtonText: {
      color: theme.onTint,
      fontSize: 16,
      fontWeight: '700',
    },
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
    },
    successTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    successSubtitle: {
      fontSize: 14,
      color: theme.muted,
    },
    doneButton: {
      marginTop: 16,
      backgroundColor: theme.tint,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    doneButtonText: {
      color: theme.onTint,
      fontSize: 15,
      fontWeight: '700',
    },
  });
