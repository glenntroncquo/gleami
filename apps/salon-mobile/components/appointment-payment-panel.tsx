import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { Pressable } from '@/components/pressable-scale';
import { Button, ErrorBanner, ListGroup, ListRow, SectionHeader, TextField } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  checkoutItemDiscountAmount,
  createOrderWithPayment,
  type CheckoutLineItem,
  type CheckoutPaymentType,
  type CheckoutProductLine,
} from '@/lib/api/checkout';
import { fetchAppointmentPaymentItems } from '@/lib/api/orders';
import { fetchProducts, findProductByBarcode, type ManagedProduct } from '@/lib/api/products';
import { checkoutBalance, ordersForAppointment, publishPayments, type LinkedOrder } from '@/lib/appointment-payment-state';
import type { AppointmentRow } from '@/lib/api/calendar';

type DiscountType = 'percentage' | 'fixed';
type EditableLine = CheckoutLineItem & {
  quantity: number;
  discountType: DiscountType;
  discountPercentage: number;
  discountAmount: number;
};
type EditableProductLine = CheckoutProductLine & {
  discountType: DiscountType;
  discountPercentage: number;
  discountAmount: number;
};

const PAYMENT_TYPES: CheckoutPaymentType[] = ['cash', 'card', 'invoice', 'bank_transfer'];
const CHECKOUT_BARCODE_EVENT = 'checkout-barcode-scanned';

function money(value: number) {
  return `€${value.toFixed(2)}`;
}

function initialServiceLines(appointment: AppointmentRow): EditableLine[] {
  return appointment.appointment_segment
    .filter((segment) => segment.service && segment.service_variant)
    .sort((a, b) => a.sequence - b.sequence)
    .map((segment) => ({
      appointmentSegmentId: segment.id,
      serviceId: segment.service!.id,
      serviceVariantId: segment.service_variant!.id,
      name: `${segment.service!.name} - ${segment.service_variant!.name}`,
      price: Math.round(Number(segment.price ?? segment.service_variant!.price ?? 0) * 100) / 100,
      vatRate: segment.service_variant!.vat_rate ?? 0,
      quantity: 1,
      discountType: 'percentage',
      discountPercentage: 0,
      discountAmount: 0,
    }));
}

function lineDiscount(line: EditableLine | EditableProductLine) {
  return checkoutItemDiscountAmount(line);
}

function lineTotal(line: EditableLine | EditableProductLine) {
  return Math.max(0, line.price * line.quantity - lineDiscount(line));
}

function lineTax(line: EditableLine | EditableProductLine) {
  const gross = lineTotal(line);
  const rate = line.vatRate ?? 0;
  if (rate <= 0 || gross <= 0) return 0;
  return Math.round((gross * rate) / (100 + rate) * 100) / 100;
}

function discountLabel(line: EditableLine | EditableProductLine) {
  return line.discountType === 'percentage'
    ? `${line.discountPercentage.toFixed(1)}%`
    : money(line.discountAmount);
}

export function AppointmentPaymentPanel({
  appointment,
  companyId,
  canCheckout,
}: {
  appointment: AppointmentRow;
  companyId: string | null;
  canCheckout: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [serviceLines, setServiceLines] = React.useState<EditableLine[]>(() => initialServiceLines(appointment));
  const [productLines, setProductLines] = React.useState<EditableProductLine[]>([]);
  const [allProducts, setAllProducts] = React.useState<ManagedProduct[]>([]);
  const [showProductPicker, setShowProductPicker] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const [priceDraft, setPriceDraft] = React.useState('');
  const [discountDraft, setDiscountDraft] = React.useState('');
  const [paymentType, setPaymentType] = React.useState<CheckoutPaymentType>('cash');
  const [customAmount, setCustomAmount] = React.useState(false);
  const [priorOrders, setPriorOrders] = React.useState<LinkedOrder[]>([]);
  const [amountDraft, setAmountDraft] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reloadOrders = React.useCallback(async () => {
    if (!companyId) return;
    try {
      const items = await fetchAppointmentPaymentItems(companyId, [appointment.id]);
      setPriorOrders(ordersForAppointment(items, appointment.id));
    } catch {
      // Keep the local payment state if a refresh is temporarily unavailable.
    }
  }, [appointment.id, companyId]);

  useFocusEffect(
    React.useCallback(() => {
      reloadOrders();
    }, [reloadOrders])
  );

  React.useEffect(() => {
    if (!companyId) return;
    let active = true;
    fetchProducts(companyId)
      .then((products) => {
        if (active) setAllProducts(products);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [companyId]);

  const addProduct = React.useCallback(
    (product: ManagedProduct) => {
      const price = Math.round((product.price_gross ?? 0) * 100) / 100;
      setProductLines((current) => {
        const index = current.findIndex((line) => line.productId === product.id);
        if (index >= 0) {
          return current.map((line, lineIndex) =>
            lineIndex === index ? { ...line, quantity: line.quantity + 1 } : line
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
            discountType: 'percentage',
            discountPercentage: 0,
            discountAmount: 0,
          },
        ];
      });
      setShowProductPicker(false);
      setProductSearchTerm('');
    },
    [t]
  );

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(CHECKOUT_BARCODE_EVENT, async ({ code }: { code: string }) => {
      if (!companyId) return;
      try {
        const product = await findProductByBarcode(companyId, code);
        if (product) addProduct(product);
        else setError(t('checkout.noProductFound'));
      } catch {
        setError(t('checkout.noProductFound'));
      }
    });
    return () => subscription.remove();
  }, [addProduct, companyId, t]);

  const filteredProducts = React.useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) return allProducts;
    return allProducts.filter((product) =>
      `${product.name ?? ''} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase().includes(term)
    );
  }, [allProducts, productSearchTerm]);

  const subtotal =
    serviceLines.reduce((sum, line) => sum + line.price * line.quantity, 0) +
    productLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount =
    serviceLines.reduce((sum, line) => sum + lineDiscount(line), 0) +
    productLines.reduce((sum, line) => sum + lineDiscount(line), 0);
  const total = Math.max(0, subtotal - discount);
  const tax =
    serviceLines.reduce((sum, line) => sum + lineTax(line), 0) +
    productLines.reduce((sum, line) => sum + lineTax(line), 0);
  const balance = checkoutBalance(total, priorOrders);
  const amount = amountDraft || balance.remainder.toFixed(2);
  const amountValue = Number(amount.replace(',', '.'));
  const hasItems = serviceLines.length > 0 || productLines.length > 0;
  const alreadySettled = total > 0 && balance.remainder <= 0.001;
  const canSubmit =
    canCheckout &&
    hasItems &&
    Number.isFinite(amountValue) &&
    amountValue >= 0 &&
    !processing &&
    (alreadySettled || amountValue > 0);

  const updatePrice = (key: string, value: string) => {
    const next = Math.max(0, Math.round((Number(value.replace(',', '.')) || 0) * 100) / 100);
    setServiceLines((lines) => lines.map((line) => line.appointmentSegmentId === key ? { ...line, price: next } : line));
    setProductLines((lines) => lines.map((line) => line.productId === key ? { ...line, price: next } : line));
  };

  const updateDiscount = (key: string, value: string) => {
    const numeric = Number(value.replace(',', '.'));
    const service = serviceLines.find((line) => line.appointmentSegmentId === key);
    const product = productLines.find((line) => line.productId === key);
    const line = service ?? product;
    if (!line) return;
    const clamped = Math.max(0, Math.min(line.discountType === 'percentage' ? 100 : line.price, Number.isFinite(numeric) ? numeric : 0));
    const rounded = line.discountType === 'percentage'
      ? Math.round(clamped * 10) / 10
      : Math.round(clamped * 100) / 100;
    setServiceLines((lines) => lines.map((item) => item.appointmentSegmentId === key ? {
      ...item,
      ...(item.discountType === 'percentage' ? { discountPercentage: rounded } : { discountAmount: rounded }),
    } : item));
    setProductLines((lines) => lines.map((item) => item.productId === key ? {
      ...item,
      ...(item.discountType === 'percentage' ? { discountPercentage: rounded } : { discountAmount: rounded }),
    } : item));
  };

  const toggleDiscountType = (key: string) => {
    const update = <T extends EditableLine | EditableProductLine>(line: T): T => {
      if (line.discountType === 'percentage') {
        return {
          ...line,
          discountType: 'fixed',
          discountAmount: Math.min(line.price, Math.round(line.price * line.discountPercentage / 100 * 100) / 100),
          discountPercentage: 0,
        };
      }
      return {
        ...line,
        discountType: 'percentage',
        discountPercentage: line.price > 0 ? Math.min(100, Math.round(line.discountAmount / line.price * 1000) / 10) : 0,
        discountAmount: 0,
      };
    };
    const current = serviceLines.find((line) => line.appointmentSegmentId === key)
      ?? productLines.find((line) => line.productId === key);
    if (current) {
      const next = update(current);
      setDiscountDraft(String(next.discountType === 'percentage' ? next.discountPercentage : next.discountAmount));
    }
    setServiceLines((lines) => lines.map((line) => line.appointmentSegmentId === key ? update(line) : line));
    setProductLines((lines) => lines.map((line) => line.productId === key ? update(line) : line));
  };

  const adjustQuantity = (key: string, delta: number, locked = false) => {
    setServiceLines((lines) => lines.map((line) => line.appointmentSegmentId === key
      ? { ...line, quantity: Math.max(locked ? 1 : 0, line.quantity + delta) }
      : line).filter((line) => line.quantity > 0));
    setProductLines((lines) => lines.map((line) => line.productId === key
      ? { ...line, quantity: Math.max(0, line.quantity + delta) }
      : line).filter((line) => line.quantity > 0));
  };

  const openLine = (key: string, line: EditableLine | EditableProductLine) => {
    if (expandedKey === key) {
      updatePrice(key, priceDraft);
      setExpandedKey(null);
      return;
    }
    if (expandedKey) updatePrice(expandedKey, priceDraft);
    setPriceDraft(String(line.price));
    setDiscountDraft(line.discountType === 'percentage' ? String(line.discountPercentage) : String(line.discountAmount));
    setExpandedKey(key);
  };

  const renderAdjuster = (line: EditableLine | EditableProductLine, key: string) => (
    <View style={styles.adjuster}>
      <TextField
        label={t('checkout.price')}
        value={priceDraft}
        onChangeText={(value) => {
          setPriceDraft(value);
          if (value.trim() === '' || /[.,]$/.test(value)) return;
          updatePrice(key, value);
        }}
        onBlur={() => updatePrice(key, priceDraft)}
        keyboardType="decimal-pad"
      />
      <View style={styles.discountRow}>
      <TextField
        label={t('checkout.discount')}
        value={discountDraft}
        onChangeText={(value) => {
          setDiscountDraft(value);
          updateDiscount(key, value);
        }}
        keyboardType="decimal-pad"
        containerStyle={styles.discountField}
      />
      <View style={[styles.discountSwitch, { backgroundColor: theme.surfaceRaised }]}>
        {(['percentage', 'fixed'] as const).map((type) => {
          const selected = line.discountType === type;
          const label = type === 'percentage' ? '%' : '€';
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              onPress={() => {
                if (!selected) toggleDiscountType(key);
              }}
              style={[styles.discountOption, selected && { backgroundColor: theme.card }]}>
              <Text style={[styles.discountOptionText, { color: theme.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      </View>
    </View>
  );

  const renderServiceLine = (line: EditableLine) => {
    const key = line.appointmentSegmentId;
    const open = expandedKey === key;
    const discounted = lineDiscount(line) > 0;
    return (
      <View key={key}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityHint={t('checkout.adjustPrice')}
          onPress={() => openLine(key, line)}
          style={styles.lineRow}>
          <View style={styles.lineText}>
            <Text style={[styles.lineName, { color: theme.text }]} numberOfLines={2}>{line.name}</Text>
            {discounted ? <Text style={[styles.lineMeta, { color: theme.muted }]}>{t('checkout.discount')} {discountLabel(line)}</Text> : null}
          </View>
          <Text style={[styles.linePrice, { color: theme.text }]}>{money(lineTotal(line))}</Text>
          <AppIcon name={open ? 'arrowUp' : 'arrowDown'} size={16} color={theme.muted} />
        </Pressable>
        {open ? renderAdjuster(line, key) : null}
      </View>
    );
  };

  const renderProductLine = (line: EditableProductLine) => {
    const key = line.productId;
    const open = expandedKey === key;
    const discounted = lineDiscount(line) > 0;
    return (
      <View key={key}>
        <View style={styles.lineRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityHint={t('checkout.adjustPrice')}
            onPress={() => openLine(key, line)}
            style={styles.lineText}>
            <Text style={[styles.lineName, { color: theme.text }]} numberOfLines={2}>{line.name}</Text>
            {discounted ? <Text style={[styles.lineMeta, { color: theme.muted }]}>{t('checkout.discount')} {discountLabel(line)}</Text> : null}
          </Pressable>
          <View style={styles.qtyStepper}>
            <Pressable
              accessibilityLabel={line.quantity <= 1 ? t('common.delete') : t('checkout.decreaseQuantity')}
              onPress={() => adjustQuantity(key, -1)}
              hitSlop={6}
              style={[styles.qtyButton, { backgroundColor: theme.surfaceRaised }]}>
              <Text style={[styles.qtyButtonText, { color: theme.text }]}>{line.quantity <= 1 ? '×' : '−'}</Text>
            </Pressable>
            <Text style={[styles.qtyValue, { color: theme.text }]}>{line.quantity}</Text>
            <Pressable
              accessibilityLabel={t('checkout.increaseQuantity')}
              onPress={() => adjustQuantity(key, 1)}
              hitSlop={6}
              style={[styles.qtyButton, { backgroundColor: theme.surfaceRaised }]}>
              <Text style={[styles.qtyButtonText, { color: theme.text }]}>+</Text>
            </Pressable>
          </View>
          <Text style={[styles.linePrice, { color: theme.text }]}>{money(lineTotal(line))}</Text>
        </View>
        {open ? renderAdjuster(line, key) : null}
      </View>
    );
  };

  const handleComplete = async () => {
    if (!companyId || !canSubmit) return;
    if (alreadySettled && amountValue <= 0) {
      publishPayments(companyId, {
        [appointment.id]: { status: 'paid', amountPaid: total, totalAmount: total },
      });
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const result = await createOrderWithPayment({
        companyId,
        locationId: locationId ?? undefined,
        appointmentId: appointment.id,
        clientId: appointment.client_id ?? undefined,
        lineItems: serviceLines,
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
      publishPayments(companyId, {
        [appointment.id]: {
          status: collectedNow + 0.001 >= total ? 'paid' : 'partial',
          amountPaid: collectedNow,
          totalAmount: total,
        },
      });
      setAmountDraft('');
      await reloadOrders();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.failedToComplete'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessing(false);
    }
  };

  const due = balance.collected > 0 ? balance.remainder : total;
  const showBreakdown = discount > 0 || tax > 0 || balance.collected > 0;
  const payLabel = alreadySettled && amountValue <= 0
    ? t('checkout.done')
    : t('checkout.payAmount', { amount: money(amountValue) });

  if (!canCheckout) {
    return (
      <View style={styles.readonly}>
        <Text style={[styles.dueLabel, { color: theme.muted }]}>{t('checkout.total')}</Text>
        <Text style={[styles.dueValue, { color: theme.text }]}>{money(total)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />

        <View style={styles.section}>
          <SectionHeader title={t('appointment.services')} />
          {serviceLines.length === 0 ? (
            <EmptyState compact title={t('checkout.noLineItems')} subtitle={t('checkout.noLineItemsHint')} />
          ) : (
            <ListGroup inset={16}>
              {serviceLines.map((line) => renderServiceLine(line))}
            </ListGroup>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title={t('checkout.products')} />
          <ListGroup inset={16}>
            {productLines.map((line) => renderProductLine(line))}
            <ListRow
              icon="add"
              title={t('checkout.addProduct')}
              chevron={false}
              onPress={() => setShowProductPicker((value) => !value)}
              expanded={showProductPicker}
            />
            <ListRow
              icon="barcode"
              title={t('checkout.scanBarcode')}
              chevron={false}
              onPress={() => router.push({ pathname: '/barcode-scanner', params: { event: CHECKOUT_BARCODE_EVENT } })}
            />
          </ListGroup>
          {showProductPicker ? (
            <View style={styles.productPicker}>
              <TextField
                autoFocus
                placeholder={t('products.searchPlaceholder')}
                value={productSearchTerm}
                onChangeText={setProductSearchTerm}
              />
              {filteredProducts.length === 0 ? (
                <Text style={[styles.mutedText, { color: theme.muted }]}>{t('products.noResults')}</Text>
              ) : (
                <ListGroup inset={16}>
                  {filteredProducts.slice(0, 20).map((product) => (
                    <ListRow
                      key={product.id}
                      title={product.name || t('products.unnamed')}
                      value={money(product.price_gross ?? 0)}
                      chevron={false}
                      onPress={() => addProduct(product)}
                    />
                  ))}
                </ListGroup>
              )}
            </View>
          ) : null}
        </View>

        <View style={[styles.dueCard, { backgroundColor: theme.card }]}>
          {showBreakdown ? (
            <View style={styles.breakdown}>
              {discount > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.muted }]}>{t('checkout.subtotal')}</Text>
                  <Text style={[styles.breakdownValue, { color: theme.text }]}>{money(subtotal)}</Text>
                </View>
              ) : null}
              {discount > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.muted }]}>{t('checkout.discount')}</Text>
                  <Text style={[styles.breakdownValue, { color: theme.text }]}>{`-${money(discount)}`}</Text>
                </View>
              ) : null}
              {tax > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.muted }]}>{t('checkout.tax')}</Text>
                  <Text style={[styles.breakdownValue, { color: theme.text }]}>{money(tax)}</Text>
                </View>
              ) : null}
              {balance.collected > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: theme.muted }]}>{t('checkout.paid')}</Text>
                  <Text style={[styles.breakdownValue, { color: theme.text }]}>{money(balance.collected)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={[styles.dueLabel, { color: theme.muted }]}>
            {balance.collected > 0 ? t('checkout.remaining') : t('checkout.total')}
          </Text>
          <Text style={[styles.dueValue, { color: theme.text }]}>{money(due)}</Text>
        </View>

        {alreadySettled ? null : (
          <View style={styles.section}>
            <SectionHeader title={t('checkout.paymentMethod')} />
            <View style={styles.methodGrid}>
              {PAYMENT_TYPES.slice(0, 2).map((type) => {
                const selected = paymentType === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPaymentType(type)}
                    style={[styles.method, { backgroundColor: selected ? theme.text : theme.card }]}>
                    <Text style={[styles.methodLabel, { color: selected ? theme.background : theme.text }]}>
                      {t(`checkout.paymentTypes.${type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.methodGrid}>
              {PAYMENT_TYPES.slice(2).map((type) => {
                const selected = paymentType === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setPaymentType(type)}
                    style={[styles.method, { backgroundColor: selected ? theme.text : theme.card }]}>
                    <Text style={[styles.methodLabel, { color: selected ? theme.background : theme.text }]}>
                      {t(`checkout.paymentTypes.${type}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {customAmount ? (
              <TextField
                label={t('checkout.amount')}
                value={amount}
                onChangeText={setAmountDraft}
                keyboardType="decimal-pad"
                autoFocus
              />
            ) : (
              <Pressable accessibilityRole="button" onPress={() => setCustomAmount(true)} style={styles.otherAmount}>
                <Text style={[styles.otherAmountLabel, { color: theme.tint }]}>{t('checkout.otherAmount')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={payLabel}
          onPress={handleComplete}
          disabled={!canSubmit}
          loading={processing}
        />
      </View>
    </View>
  );
}

const createStyles = (_theme: typeof Colors.light) =>
  StyleSheet.create({
    screen: { flex: 1 },
    scrollView: { flex: 1 },
    scroll: {
      paddingHorizontal: Design.screenPadding,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 24,
    },
    section: { gap: 8 },
    readonly: { paddingHorizontal: Design.screenPadding, paddingTop: 28, alignItems: 'center', gap: 4 },
    lineRow: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    lineText: { flex: 1, gap: 2 },
    lineName: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
    lineMeta: { fontSize: 13 },
    linePrice: { fontSize: 15, fontWeight: '700' },
    qtyStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    qtyButtonText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
    qtyValue: { minWidth: 16, textAlign: 'center', fontSize: 14, fontWeight: '600' },
    adjuster: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
    discountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    discountField: { flex: 1, marginBottom: 0 },
    discountSwitch: { flexDirection: 'row', borderRadius: 10, padding: 2, gap: 2, marginBottom: 2 },
    discountOption: { minWidth: 36, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
    discountOptionText: { fontSize: 14, fontWeight: '700' },
    productPicker: { gap: 10 },
    mutedText: { fontSize: 13, paddingHorizontal: 4 },
    dueCard: { borderRadius: Design.cardRadius, borderCurve: 'continuous', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', gap: 4 },
    breakdown: { alignSelf: 'stretch', gap: 6, marginBottom: 10 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownLabel: { fontSize: 14 },
    breakdownValue: { fontSize: 14, fontWeight: '600' },
    dueLabel: { fontSize: 13, fontWeight: '600' },
    dueValue: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6 },
    methodGrid: { flexDirection: 'row', gap: 8 },
    method: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    methodLabel: { fontSize: 15, fontWeight: '600' },
    otherAmount: { alignSelf: 'center', paddingVertical: 8 },
    otherAmountLabel: { fontSize: 15, fontWeight: '600' },
    footer: { paddingHorizontal: Design.screenPadding, paddingTop: 8, paddingBottom: 12 },
  });
