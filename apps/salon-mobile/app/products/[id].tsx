import { ScreenScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, DeviceEventEmitter, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FormSkeleton } from '@/components/content-skeletons';
import { TaxonomyChipPicker } from '@/components/taxonomy-chip-picker';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ManagedProduct,
  ProductTaxonomyRow,
  createProductLine,
  deleteProduct,
  fetchProduct,
  fetchProductCategories,
  fetchProductLines,
  updateProduct,
} from '@/lib/api/products';

const BARCODE_SCAN_EVENT = 'product-barcode-scanned';

function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export default function ProductDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [product, setProduct] = React.useState<ManagedProduct | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [barcode, setBarcode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [costPrice, setCostPrice] = React.useState('');
  const [priceInclVat, setPriceInclVat] = React.useState('');
  const [vatRate, setVatRate] = React.useState('21');
  const [stockQty, setStockQty] = React.useState('0');
  const [active, setActive] = React.useState(true);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [lineId, setLineId] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<ProductTaxonomyRow[]>([]);
  const [lines, setLines] = React.useState<ProductTaxonomyRow[]>([]);

  const load = React.useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchProduct(id);
      if (!data) {
        setErrorMessage(t('products.failedToLoad'));
        return;
      }
      setProduct(data);
      setName(data.name || '');
      setSku(data.sku || '');
      setBarcode(data.barcode || '');
      setDescription(data.description || '');
      setCostPrice(data.cost_price != null ? String(data.cost_price) : '');
      setPriceInclVat(data.price_gross != null ? String(data.price_gross) : '');
      setVatRate(data.vat_rate != null ? String(data.vat_rate) : '21');
      setStockQty(data.stock_qty != null ? String(data.stock_qty) : '0');
      setActive(data.active ?? true);
      setCategoryId(data.product_category_id);
      setLineId(data.product_line_id);
      setErrorMessage(null);
    } catch {
      setErrorMessage(t('products.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!companyId) return;
    Promise.all([fetchProductCategories(), fetchProductLines(companyId)])
      .then(([cats, prodLines]) => {
        setCategories(cats);
        setLines(prodLines);
      })
      .catch(() => {});
  }, [companyId]);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(BARCODE_SCAN_EVENT, ({ code }: { code: string }) => {
      setBarcode(code);
    });
    return () => sub.remove();
  }, []);

  const canSave = name.trim().length > 0 && priceInclVat.trim().length > 0 && stockQty.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!id || !canSave) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const priceGross = parseDecimal(priceInclVat) ?? 0;
      const vat = parseDecimal(vatRate) ?? 21;
      const priceNet = priceGross / (1 + vat / 100);
      await updateProduct(id, {
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        costPrice: parseDecimal(costPrice),
        priceGross,
        priceNet,
        vatRate: vat,
        stockQty: Math.max(0, Math.trunc(parseDecimal(stockQty) ?? 0)),
        active,
        productCategoryId: categoryId,
        productLineId: lineId,
      });
      router.back();
    } catch {
      setErrorMessage(t('products.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(t('products.deleteConfirmTitle'), t('products.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteProduct(id);
            router.back();
          } catch {
            setErrorMessage(t('products.failedToDelete'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <Stack.Screen options={{ headerShown: true, title: t('products.edit') }} />
        <FormSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: product?.name || t('products.edit'),
          headerRight: () => (
            <View style={styles.headerActions}>
              <HeaderButton onPress={handleDelete} disabled={deleting} hitSlop={8}>
                <AppIcon name="delete" size={20} color={theme.error} />
              </HeaderButton>
              <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8} style={styles.headerTextButton}>
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('client.save')}</Text>
              </HeaderButton>
            </View>
          ),
        }}
      />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScreenScrollView contentContainerStyle={styles.form}>
        <Text style={styles.sectionLabel}>{t('products.form.name')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('products.form.namePlaceholder')}
          placeholderTextColor={theme.muted}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.sku')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('products.form.skuPlaceholder')}
              placeholderTextColor={theme.muted}
              value={sku}
              onChangeText={setSku}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.barcode')}</Text>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.input, styles.barcodeInput]}
                placeholder={t('products.form.barcodePlaceholder')}
                placeholderTextColor={theme.muted}
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="number-pad"
              />
              <Pressable
                style={styles.scanButton}
                onPress={() => router.push({ pathname: '/barcode-scanner', params: { event: BARCODE_SCAN_EVENT } })}>
                <AppIcon name="barcode" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('products.form.description')}</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t('products.form.descriptionPlaceholder')}
          placeholderTextColor={theme.muted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.sectionLabel}>{t('products.form.productCategory')}</Text>
        <TaxonomyChipPicker
          options={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          noneLabel={t('products.form.noneOption')}
          theme={theme}
        />

        <Text style={styles.sectionLabel}>{t('products.form.productLine')}</Text>
        <TaxonomyChipPicker
          options={lines}
          selectedId={lineId}
          onSelect={setLineId}
          noneLabel={t('products.form.noneOption')}
          theme={theme}
          createLabel={t('products.addLine.trigger')}
          createPlaceholder={t('products.addLine.namePlaceholder')}
          onCreate={(newName) => createProductLine(companyId!, newName)}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.costPrice')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={theme.muted}
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.priceInclVat')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={theme.muted}
              value={priceInclVat}
              onChangeText={setPriceInclVat}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.rowFields}>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.vatRate')}</Text>
            <TextInput
              style={styles.input}
              placeholder="21"
              placeholderTextColor={theme.muted}
              value={vatRate}
              onChangeText={setVatRate}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowField}>
            <Text style={styles.sectionLabel}>{t('products.form.stockQty')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={theme.muted}
              value={stockQty}
              onChangeText={setStockQty}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.activeRow}>
          <Text style={styles.activeLabel}>{t('products.form.active')}</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.tint,
    },
    saveTextDisabled: {
      color: theme.muted,
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
    form: {
      padding: 16,
      gap: 4,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginTop: 12,
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
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    rowFields: {
      flexDirection: 'row',
      gap: 12,
    },
    rowField: {
      flex: 1,
    },
    barcodeRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    barcodeInput: {
      flex: 1,
    },
    scanButton: {
      width: Design.touchTarget,
      height: Design.touchTarget,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    activeLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
