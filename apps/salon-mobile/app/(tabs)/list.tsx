import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { TabScreen } from '@/components/tab-screen';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import {
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
import { LiquidGlass } from '@/components/liquid-glass';
import { SkeletonBlock } from '@/components/skeleton-block';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Client, fetchClients } from '@/lib/api/clients';
import { getInitialsFromLabel } from '@/lib/text';

/** How long a load can take before we bother showing a skeleton at all — avoids a flash on fast responses. */
const SKELETON_DELAY_MS = 300;
const SKELETON_ROW_COUNT = 8;

function clientName(client: Client, fallback: string) {
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || fallback;
}

function ClientRowSkeleton({ styles, index }: { styles: ReturnType<typeof createStyles>; index: number }) {
  const nameWidth = 46 - (index % 3) * 8;
  const subtitleWidth = 34 - (index % 4) * 6;
  return (
    <View style={styles.row}>
      <SkeletonBlock style={styles.avatar} />
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
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const reduceMotion = useReducedMotion();

  // Tracks which location we last successfully loaded, so refocusing the tab (e.g.
  // coming back from a client's detail screen) can refresh in place instead of
  // showing a skeleton over data we already have.
  const loadedLocationRef = React.useRef<string | null>(null);

  const loadClients = React.useCallback(async (showLoading: boolean) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    if (!locationId) {
      setClients([]);
      setLoading(false);
      loadedLocationRef.current = null;
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const data = await fetchClients(companyId, locationId);
      setClients(data);
      setError(null);
      loadedLocationRef.current = locationId;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoadClients'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [companyId, locationId, locationLoading, t]);

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

  const filteredClients = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const name = clientName(client, '').toLowerCase();
      const email = (client.email ?? '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [clients, searchTerm]);

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
        <Text style={styles.title}>{t('client.title')}</Text>
      </View>

      {!showNoCompanyState ? (
        <View style={styles.searchRow}>
          <AppIcon name="search" size={20} color={theme.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('client.searchPlaceholder')}
            placeholderTextColor={theme.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
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
          data={filteredClients}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[styles.listContent, filteredClients.length === 0 && styles.listContentEmpty]}
          ListEmptyComponent={
            searchTerm ? (
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
            return (
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitialsFromLabel(name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{name}</Text>
                  {item.email ? <Text style={styles.rowSubtitle}>{item.email}</Text> : null}
                </View>
                <AppIcon name="chevronRight" size={22} color={theme.muted} />
              </Pressable>
            );
          }}
        />
        </Animated.View>
      )}

      {!showNoCompanyState ? (
        <LiquidGlass style={styles.fab}>
          <Pressable
            style={styles.fabButton}
            accessibilityLabel={t('client.addNew')}
            onPress={() => router.push('/client/new')}
          >
            <AppIcon name="add" size={26} color={theme.text} />
          </Pressable>
        </LiquidGlass>
      ) : null}
    </>
    </TabScreen>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 12,
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
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
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
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      padding: 4,
      borderRadius: 31,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    fabButton: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
