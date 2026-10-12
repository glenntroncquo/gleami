import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TaxonomyChipPicker } from '@/components/taxonomy-chip-picker';
import { Button, ErrorBanner, Field, FieldRow, FormScreen, ListGroup, SwitchRow, TextField, useModalHeader } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ProductTaxonomyRow,
  createProduct,
  createProductLine,
  fetchProductCategories,
  fetchProductLines,
} from '@/lib/api/products';

const BARCODE_SCAN_EVENT = 'product-barcode-scanned';

function parseDecimal(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export default function NewProductScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const modalHeader = useModalHeader();

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
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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
    if (!companyId || !canSave) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const priceGross = parseDecimal(priceInclVat) ?? 0;
      const vat = parseDecimal(vatRate) ?? 21;
      const priceNet = priceGross / (1 + vat / 100);
      const product = await createProduct(companyId, {
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
      router.replace({ pathname: '/products/[id]', params: { id: product.id } });
    } catch {
      setErrorMessage(t('products.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('products.addNew')}
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={!canSave} />}>
        <ErrorBanner message={errorMessage} />
        <TextField
          label={t('products.form.name')}
          placeholder={t('products.form.namePlaceholder')}
          value={name}
          onChangeText={setName}
        />

        <FieldRow>
          <TextField
            label={t('products.form.sku')}
            placeholder={t('products.form.skuPlaceholder')}
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
          />
          <Field label={t('products.form.barcode')}>
            <View style={styles.barcodeRow}>
              <TextField
                accessibilityLabel={t('products.form.barcode')}
                containerStyle={styles.flex}
                placeholder={t('products.form.barcodePlaceholder')}
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="number-pad"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('products.form.barcode')}
                style={[styles.scanButton, { borderColor: theme.border }]}
                onPress={() => router.push({ pathname: '/barcode-scanner', params: { event: BARCODE_SCAN_EVENT } })}>
                <AppIcon name="barcode" size={20} color={theme.text} />
              </Pressable>
            </View>
          </Field>
        </FieldRow>

        <TextField
          label={t('products.form.description')}
          placeholder={t('products.form.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Field label={t('products.form.productCategory')}>
          <TaxonomyChipPicker
            options={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
            noneLabel={t('products.form.noneOption')}
            theme={theme}
          />
        </Field>

        <Field label={t('products.form.productLine')}>
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
        </Field>

        <FieldRow>
          <TextField
            label={t('products.form.costPrice')}
            placeholder="0.00"
            value={costPrice}
            onChangeText={setCostPrice}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t('products.form.priceInclVat')}
            placeholder="0.00"
            value={priceInclVat}
            onChangeText={setPriceInclVat}
            keyboardType="decimal-pad"
          />
        </FieldRow>

        <FieldRow>
          <TextField
            label={t('products.form.vatRate')}
            placeholder="21"
            value={vatRate}
            onChangeText={setVatRate}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t('products.form.stockQty')}
            placeholder="0"
            value={stockQty}
            onChangeText={setStockQty}
            keyboardType="number-pad"
          />
        </FieldRow>

        <ListGroup>
          <SwitchRow title={t('products.form.active')} value={active} onValueChange={setActive} />
        </ListGroup>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  barcodeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: Design.controlRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
