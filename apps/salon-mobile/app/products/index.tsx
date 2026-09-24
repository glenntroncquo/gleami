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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
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
              <Pressable
                style={styles.row}
                onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, item.active === false && styles.rowNameInactive]}>
                    {item.name || t('products.unnamed')}
                  </Text>
                  {item.sku ? <Text style={styles.rowSubtitle}>{item.sku}</Text> : null}
                </View>
                <View style={[styles.stockBadge, { backgroundColor: theme[`${tone}Surface`] }]}>
                  <Text style={[styles.stockBadgeText, { color: theme[tone] }]}>{item.stock_qty ?? 0}</Text>
                </View>
                <AppIcon name="chevronRight" size={22} color={theme.muted} />
              </Pressable>
            );
          }}
        />
      )}

      {!showNoCompanyState ? (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/products/new')}>
          <AppIcon name="add" size={26} color={theme.text} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
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
      paddingTop: 60,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowNameInactive: {
      color: theme.muted,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
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
      fontWeight: '700',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.text,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
  });
