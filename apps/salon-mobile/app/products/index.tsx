import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { IconTile, ListRow } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ManagedProduct, fetchProducts } from '@/lib/api/products';

function stockTone(stockQty: number | null): 'success' | 'warning' | 'error' {
  const qty = stockQty ?? 0;
  if (qty > 10) return 'success';
  if (qty > 0) return 'warning';
  return 'error';
}

export default function ProductsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [products, setProducts] = React.useState<ManagedProduct[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchProducts(companyId);
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filteredProducts = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => {
      const haystack = `${product.name ?? ''} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [products, searchTerm]);

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: true, title: t('products.title') }} />

      {!showNoCompanyState && !loading ? (
        <View style={styles.searchRow}>
          <AppIcon name="search" size={20} color={theme.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('products.searchPlaceholder')}
            placeholderTextColor={theme.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <RowListSkeleton />
      ) : showNoCompanyState ? (
        <EmptyState icon="inventory" title={t('calendar.noCompany')} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, filteredProducts.length === 0 && styles.listContentEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            searchTerm ? (
              <EmptyState icon="search" title={t('products.noResults')} />
            ) : (
              <EmptyState
                icon="inventory"
                title={t('products.noProducts')}
                subtitle={t('products.noProductsHint')}
                actionLabel={t('products.addNew')}
                onAction={() => router.push('/products/new')}
              />
            )
          }
          renderItem={({ item }) => {
            const tone = stockTone(item.stock_qty);
            return (
              <ListRow
                title={item.name || t('products.unnamed')}
                subtitle={[item.sku, item.active === false ? t('service.inactive') : null].filter(Boolean).join(' · ')}
                leading={<IconTile name="inventory" />}
                trailing={
                  <View style={[styles.stockBadge, { backgroundColor: theme[`${tone}Surface`] }]}>
                    <Text style={[styles.stockBadgeText, { color: theme[tone] }]}>{item.stock_qty ?? 0}</Text>
                  </View>
                }
                onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
              />
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <Pressable
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel={t('products.addNew')}
          onPress={() => router.push('/products/new')}>
          <AppIcon name="add" size={26} color={theme.onTint} />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

// ListRow carries 14px horizontal padding, so the list pads only the remainder to align with the screen edge.
const ROW_INSET = 14;

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    errorBanner: {
      marginHorizontal: Design.screenPadding,
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
    listContent: {
      paddingHorizontal: Design.screenPadding - ROW_INSET,
      paddingTop: 8,
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: ROW_INSET + 40 + 14,
      marginRight: ROW_INSET,
      backgroundColor: theme.border,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 50,
      marginHorizontal: Design.screenPadding,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 14,
      borderRadius: Design.controlRadius,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontSize: 16,
      color: theme.text,
    },
    stockBadge: {
      minWidth: 34,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
      alignItems: 'center',
    },
    stockBadgeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: Design.screenPadding,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tint,
      shadowColor: theme.text,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  });
