import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { TabScreen } from '@/components/tab-screen';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Client, CLIENT_PAGE_SIZE, fetchClientsPage } from '@/lib/api/clients';

/** How long a load can take before we bother showing a skeleton at all — avoids a flash on fast responses. */
const SKELETON_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 8;

function clientName(client: Client, fallback: string) {
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || fallback;
}

function clientInitial(name: string) {
  const letter = name.trim().charAt(0).toUpperCase();
  return letter || '?';
}

function ClientRowSkeleton({ styles, index }: { styles: ReturnType<typeof createStyles>; index: number }) {
  const nameWidth = 46 - (index % 3) * 8;
  const subtitleWidth = 34 - (index % 4) * 6;
  return (
    <View style={styles.row}>
      <SkeletonBlock style={[styles.avatar, styles.skeletonFill]} />
      <View style={{ flex: 1 }}>
        <SkeletonBlock style={[styles.skeletonBar, styles.skeletonName, { width: `${nameWidth}%` }]} />
        <SkeletonBlock style={[styles.skeletonBar, styles.skeletonSubtitle, { width: `${subtitleWidth}%` }]} />
      </View>
    </View>
  );
}

function ClientListSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <ClientRowSkeleton key={index} styles={styles} index={index} />
      ))}
    </View>
  );
}

export default function ClientsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [clients, setClients] = React.useState<Client[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sortDescending, setSortDescending] = React.useState(false);
  const reduceMotion = useReducedMotion();

  // Tracks which location we last successfully loaded, so refocusing the tab (e.g.
  // coming back from a client's detail screen) can refresh in place instead of
  // showing a skeleton over data we already have.
  const loadedLocationRef = React.useRef<string | null>(null);
  const requestRef = React.useRef(0);
  const filtersRef = React.useRef({
    search: '',
    sortDescending: false,
    locationId: null as string | null,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadClients = React.useCallback(async (showLoading: boolean) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    if (!locationId) {
      setClients([]);
      setTotal(0);
      setLoading(false);
      loadedLocationRef.current = null;
      return;
    }

    const filtersChanged =
      filtersRef.current.search !== debouncedSearch ||
      filtersRef.current.sortDescending !== sortDescending ||
      filtersRef.current.locationId !== locationId;
    const pageIndex = filtersChanged ? 0 : page;
    filtersRef.current = { search: debouncedSearch, sortDescending, locationId };
    if (filtersChanged && page !== 0) {
      requestRef.current += 1;
      setPage(0);
      return;
    }

    if (showLoading) setLoading(true);
    const requestId = ++requestRef.current;
    try {
      const data = await fetchClientsPage({
        locationId,
        page: pageIndex,
        pageSize: CLIENT_PAGE_SIZE,
        search: debouncedSearch,
        sortDescending,
      });
      if (requestId !== requestRef.current) return;
      setClients(data.clients);
      setTotal(data.total);
      setError(null);
      loadedLocationRef.current = locationId;
      const lastPage = data.total === 0 ? 0 : Math.ceil(data.total / CLIENT_PAGE_SIZE) - 1;
      if (pageIndex > lastPage) setPage(lastPage);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : t('client.failedToLoadClients'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [companyId, locationId, locationLoading, t, debouncedSearch, sortDescending, page]);

  useFocusEffect(
    React.useCallback(() => {
      loadClients(loadedLocationRef.current !== locationId);
    }, [loadClients, locationId])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadClients(false);
    setRefreshing(false);
  }, [loadClients]);

  const openSort = () => {
    Alert.alert(t('client.sortByName'), undefined, [
      { text: t('client.sortNameAsc'), onPress: () => setSortDescending(false) },
      { text: t('client.sortNameDesc'), onPress: () => setSortDescending(true) },
      { text: t('client.cancel'), style: 'cancel' },
    ]);
  };

  const showInitialLoading = (loading || locationLoading) && !error;
  const showNoCompanyState = !loading && !locationLoading && !companyId;
  const showNoLocationState = !loading && !locationLoading && !!companyId && !locationId;

  // Only show the skeleton once loading has actually taken a moment, so a fast
  // response never flashes it on and off.
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  React.useEffect(() => {
    if (!showInitialLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showInitialLoading]);

  return (
    <TabScreen>
    <>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{t('client.listTitle')}</Text>
        {!showNoCompanyState ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('client.addNew')}
            onPress={() => router.push('/client/new')}
            style={styles.addButton}>
            <AppIcon name="add" size={18} color={theme.text} />
            <Text style={styles.addButtonText}>{t('client.add')}</Text>
          </Pressable>
        ) : null}
      </View>

      {!showNoCompanyState ? (
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <AppIcon name="search" size={18} color={theme.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('client.searchPlaceholder')}
              placeholderTextColor={theme.muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('client.sortByName')}
            accessibilityState={{ selected: sortDescending }}
            onPress={openSort}
            style={[styles.filterButton, sortDescending && styles.filterButtonActive]}>
            <AppIcon name="filter" size={18} color={sortDescending ? theme.tint : theme.text} />
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Pressable onPress={() => loadClients(true)}>
            <Text style={styles.errorBannerRetry}>{t('calendar.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {showInitialLoading ? (
        showSkeleton ? (
          <Animated.View key="skeleton" exiting={FadeOut.duration(reduceMotion ? 100 : 150)}>
            <ClientListSkeleton styles={styles} />
          </Animated.View>
        ) : null
      ) : showNoCompanyState ? (
        <EmptyState icon="peopleOutline" title={t('calendar.noCompany')} />
      ) : showNoLocationState ? (
        <EmptyState icon="peopleOutline" title={t('calendar.noLocation')} />
      ) : (
        <Animated.View key="content" entering={FadeIn.duration(reduceMotion ? 100 : 200)} style={{ flex: 1 }}>
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[styles.listContent, clients.length === 0 && styles.listContentEmpty]}
          ListEmptyComponent={
            searchTerm.trim() ? (
              <EmptyState
                icon="search"
                title={t('client.noResults')}
                subtitle={t('client.noResultsHint')}
                actionLabel={t('client.addNew')}
                onAction={() => router.push('/client/new')}
              />
            ) : (
              <EmptyState
                icon="peopleOutline"
                title={t('client.noClients')}
                subtitle={t('client.noClientsHint')}
                actionLabel={t('client.addNew')}
                onAction={() => router.push('/client/new')}
              />
            )
          }
          renderItem={({ item }) => {
            const name = clientName(item, t('calendar.unknownClient'));
            const detail = item.email || item.phone;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
                style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{clientInitial(name)}</Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
                  {detail ? <Text style={styles.rowSubtitle} numberOfLines={1}>{detail}</Text> : null}
                </View>
              </Pressable>
            );
          }}
        />
        {total > CLIENT_PAGE_SIZE ? (
          <View style={styles.pager}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('client.previousPage')}
              accessibilityState={{ disabled: page === 0 }}
              disabled={page === 0}
              onPress={() => setPage((current) => Math.max(0, current - 1))}
              style={[styles.pagerButton, page === 0 && styles.pagerButtonDisabled]}>
              <AppIcon name="chevronLeft" size={18} color={theme.text} />
            </Pressable>
            <Text style={styles.pagerLabel}>
              {t('client.pageRange', {
                from: page * CLIENT_PAGE_SIZE + 1,
                to: Math.min(total, (page + 1) * CLIENT_PAGE_SIZE),
                total,
              })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('client.nextPage')}
              accessibilityState={{ disabled: (page + 1) * CLIENT_PAGE_SIZE >= total }}
              disabled={(page + 1) * CLIENT_PAGE_SIZE >= total}
              onPress={() => setPage((current) => current + 1)}
              style={[
                styles.pagerButton,
                (page + 1) * CLIENT_PAGE_SIZE >= total && styles.pagerButtonDisabled,
              ]}>
              <AppIcon name="chevronRight" size={18} color={theme.text} />
            </Pressable>
          </View>
        ) : null}
        </Animated.View>
      )}

    </>
    </TabScreen>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: Design.screenPadding,
      paddingTop: 4,
      paddingBottom: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 40,
      paddingHorizontal: 14,
      borderRadius: Design.pillRadius,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    addButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    title: {
      flexShrink: 1,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: theme.text,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: Design.screenPadding,
      marginBottom: 8,
    },
    searchField: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: Design.pillRadius,
      backgroundColor: theme.field,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontSize: 16,
      color: theme.text,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    filterButtonActive: {
      borderColor: theme.tint,
      backgroundColor: theme.blueTint,
    },
    errorBanner: {
      marginHorizontal: Design.screenPadding,
      marginBottom: 12,
      padding: 12,
      borderRadius: Design.controlRadius,
      backgroundColor: theme.errorSurface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorBannerText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
    },
    errorBannerRetry: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    listContent: {
      paddingHorizontal: Design.screenPadding,
      paddingBottom: 24,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    row: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 14,
      paddingVertical: 10,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '600',
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 14,
      lineHeight: 18,
      color: theme.muted,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.blueTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    skeletonFill: {
      backgroundColor: theme.border,
    },
    skeletonBar: {
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    skeletonName: {
      height: 14,
    },
    skeletonSubtitle: {
      height: 11,
      marginTop: 6,
    },
    pager: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: Design.screenPadding,
      paddingTop: 8,
      paddingBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    pagerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    pagerButtonDisabled: {
      opacity: 0.35,
    },
    pagerLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      fontWeight: '600',
      color: theme.muted,
    },
  });
