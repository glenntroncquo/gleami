import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DetailSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useCheckout } from '@/contexts/checkout-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkoutBalance, ordersForAppointment, publishPayments, type LinkedOrder } from '@/lib/appointment-payment-state';
import { fetchAppointmentPaymentItems } from '@/lib/api/orders';
import {
  CheckoutLineItem,
  CheckoutPaymentType,
  CheckoutProductLine,
  checkoutLineItems,
  createOrderWithPayment,
  fetchAppointmentForCheckout,
} from '@/lib/api/checkout';
import { ManagedProduct, fetchProducts, findProductByBarcode } from '@/lib/api/products';

const PAYMENT_TYPES: CheckoutPaymentType[] = ['cash', 'card', 'invoice', 'bank_transfer'];
const CHECKOUT_BARCODE_EVENT = 'checkout-barcode-scanned';

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

  const [productLines, setProductLines] = React.useState<CheckoutProductLine[]>([]);
  const [allProducts, setAllProducts] = React.useState<ManagedProduct[]>([]);
  const [showProductPicker, setShowProductPicker] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');

  const [paymentType, setPaymentType] = React.useState<CheckoutPaymentType>('bank_transfer');
  const [priorOrders, setPriorOrders] = React.useState<LinkedOrder[]>([]);
  const [amountDraft, setAmountDraft] = React.useState<{ id: string; value: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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

  React.useEffect(() => {
    if (!companyId || !appointmentId) return;
    let active = true;
    fetchAppointmentPaymentItems(companyId, [appointmentId])
      .then(items => {
        if (active) setPriorOrders(ordersForAppointment(items, appointmentId));
      })
      .catch(() => {
        if (active) setPriorOrders([]);
      });
    return () => { active = false; };
  }, [companyId, appointmentId]);

  React.useEffect(() => {
    if (!companyId) return;
    let active = true;
    fetchProducts(companyId)
      .then((products) => {
        if (active) setAllProducts(products);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [companyId]);

  const addProductToCart = React.useCallback(
    (product: ManagedProduct) => {
      const price = Math.round((product.price_gross ?? 0) * 100) / 100;
      setProductLines((current) => {
        const existingIndex = current.findIndex((line) => line.productId === product.id);
        if (existingIndex >= 0) {
          return current.map((line, index) =>
            index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line
          );
        }
        return [
          ...current,
          {
            productId: product.id,
            name: product.name || t('products.unnamed'),
            price,
            quantity: 1,
            vatRate: product.vat_rate ?? 21,
            stockQty: product.stock_qty,
          },
        ];
      });
      setShowProductPicker(false);
      setProductSearchTerm('');
    },
    [t]
  );

  const updateProductQuantity = (index: number, nextQuantity: number) => {
    const line = productLines[index];
    if (!line) return;
    const clamped = Math.max(0, nextQuantity);
    if (clamped === 0) {
      setProductLines(productLines.filter((_, i) => i !== index));
    } else {
      setProductLines(productLines.map((item, i) => (i === index ? { ...item, quantity: clamped } : item)));
    }
  };

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CHECKOUT_BARCODE_EVENT, async ({ code }: { code: string }) => {
      if (!companyId) return;
      try {
        const product = await findProductByBarcode(companyId, code);
        if (product) {
          addProductToCart(product);
        } else {
          setError(t('checkout.noProductFound'));
        }
      } catch {
        setError(t('checkout.noProductFound'));
      }
    });
    return () => sub.remove();
  }, [companyId, addProductToCart, t]);

  const filteredProductOptions = React.useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) return allProducts;
    return allProducts.filter((product) => {
      const haystack = `${product.name ?? ''} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [allProducts, productSearchTerm]);

  const total =
    lineItems.reduce((sum, item) => sum + item.price, 0) +
    productLines.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const balance = checkoutBalance(total, priorOrders);
  const alreadySettled = total > 0 && balance.remainder <= 0.001;
  const amount = amountDraft?.id === appointmentId ? amountDraft.value : balance.remainder.toFixed(2);
  const amountValue = Number(amount.replace(',', '.'));
  const canSubmit =
    (lineItems.length > 0 || productLines.length > 0) && Number.isFinite(amountValue) && amountValue >= 0 && !submitting
    && (alreadySettled || amountValue > 0);

  const handleComplete = async () => {
    if (!companyId || !appointmentId || !canSubmit) return;
    if (alreadySettled && amountValue <= 0) {
      publishPayments(companyId, { [appointmentId]: { status: 'paid', amountPaid: total, totalAmount: total } });
      router.back();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createOrderWithPayment({
        companyId,
        locationId: locationId ?? undefined,
        appointmentId,
        clientId: clientId ?? undefined,
        lineItems,
        productLines,
        paymentType,
        amount: amountValue,
      });
      if (result.amountPaid <= 0) {
        setError(t('checkout.failedToComplete'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const collectedNow = Math.round((balance.collected + result.amountPaid) * 100) / 100;
      const status = collectedNow + 0.001 >= total ? 'paid' : 'partial';
      publishPayments(companyId, {
        [appointmentId]: {
          status,
          amountPaid: status === 'paid' ? total : collectedNow,
          totalAmount: total,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
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
        <DetailSkeleton />
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
          {balance.collected > 0 ? (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.lineItemName}>{t('checkout.paid')}</Text>
                <Text style={styles.lineItemPrice}>{`€${balance.collected.toFixed(2)}`}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('checkout.remaining')}</Text>
                <Text style={styles.totalValue}>{`€${balance.remainder.toFixed(2)}`}</Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.productsSectionHeader}>
            <Text style={styles.sectionLabel}>{t('checkout.products')}</Text>
            <View style={styles.productActionsRow}>
              <Pressable
                style={styles.productActionButton}
                onPress={() =>
                  router.push({ pathname: '/barcode-scanner', params: { event: CHECKOUT_BARCODE_EVENT } })
                }>
                <AppIcon name="barcode" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                style={styles.productActionButton}
                onPress={() => setShowProductPicker((current) => !current)}>
                <AppIcon name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {productLines.map((line, index) => (
            <View key={`${line.productId}-${index}`} style={styles.lineItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineItemName}>{line.name}</Text>
                {line.stockQty != null ? (
                  <Text style={styles.productStockHint}>{t('checkout.stockLeft', { count: line.stockQty })}</Text>
                ) : null}
              </View>
              <View style={styles.qtyStepper}>
                <Pressable style={styles.qtyButton} onPress={() => updateProductQuantity(index, line.quantity - 1)}>
                  <Text style={styles.qtyButtonText}>–</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{line.quantity}</Text>
                <Pressable style={styles.qtyButton} onPress={() => updateProductQuantity(index, line.quantity + 1)}>
                  <Text style={styles.qtyButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.lineItemPrice}>{`€${(line.price * line.quantity).toFixed(2)}`}</Text>
            </View>
          ))}

          {showProductPicker ? (
            <View style={styles.productPicker}>
              <TextInput
                style={styles.input}
                placeholder={t('products.searchPlaceholder')}
                placeholderTextColor={theme.muted}
                value={productSearchTerm}
                onChangeText={setProductSearchTerm}
              />
              {filteredProductOptions.slice(0, 20).map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.productOptionRow}
                  onPress={() => addProductToCart(product)}>
                  <Text style={styles.productOptionName}>{product.name || t('products.unnamed')}</Text>
                  <Text style={styles.productOptionPrice}>{`€${(product.price_gross ?? 0).toFixed(2)}`}</Text>
                </Pressable>
              ))}
              {filteredProductOptions.length === 0 ? (
                <Text style={styles.productStockHint}>{t('products.noResults')}</Text>
              ) : null}
            </View>
          ) : null}
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
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(value) => {
              if (appointmentId) setAmountDraft({ id: appointmentId, value });
            }}
            keyboardType="decimal-pad"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.completeButton, !canSubmit && styles.completeButtonDisabled]} onPress={handleComplete} disabled={!canSubmit}>
          <Text style={styles.completeButtonText}>{alreadySettled && amountValue <= 0 ? t('checkout.done') : t('checkout.complete')}</Text>
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
    productsSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    productActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    productActionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    productStockHint: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
    qtyStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    qtyButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    qtyButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    qtyValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      minWidth: 18,
      textAlign: 'center',
    },
    productPicker: {
      marginTop: 10,
      gap: 8,
    },
    productOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    productOptionName: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
    },
    productOptionPrice: {
      fontSize: 14,
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
  });
