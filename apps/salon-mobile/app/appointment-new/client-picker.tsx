import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { StaffAvatar } from '@/components/staff-avatar';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Button, ListGroup, ListRow, ScreenTitle, SectionHeader, useTheme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { Client, ClientSearchResult, fetchClients, searchClients } from '@/lib/api/clients';

import { APPOINTMENT_DRAFT_EVENTS } from '@/lib/appointment-draft';

const RECENT_CLIENTS_COLLAPSED_COUNT = 5;
const RECENT_CLIENTS_EXPANDED_COUNT = 20;

function clientDisplayName(first: string | null | undefined, last: string | null | undefined, fallback: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || fallback;
}

export default function ClientPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const theme = useTheme();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [recentClients, setRecentClients] = React.useState<Client[]>([]);
  const [recentClientsLoading, setRecentClientsLoading] = React.useState(true);
  const [showAllRecent, setShowAllRecent] = React.useState(false);

  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    setRecentClientsLoading(true);
    fetchClients(companyId, locationId)
      .then(setRecentClients)
      .catch(() => setRecentClients([]))
      .finally(() => setRecentClientsLoading(false));
  }, [companyId, locationId]);

  React.useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const handleSearchChange = React.useCallback((text: string) => {
    setSearchTerm(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (text.trim().length < 2 || !companyId) {
      setResults([]);
      setSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchClients(text, companyId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [companyId]);

  const selectClient = React.useCallback(
    (client: ClientSearchResult) => {
      DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.selectClient, client);
      router.back();
    },
    [router]
  );

  const visibleRecentClients = recentClients.slice(0, showAllRecent ? RECENT_CLIENTS_EXPANDED_COUNT : RECENT_CLIENTS_COLLAPSED_COUNT);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <ScreenTitle title={t('appointment.client')} />
        <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <AppIcon name="search" size={18} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('appointment.searchClientPlaceholder')}
            placeholderTextColor={theme.muted}
            value={searchTerm}
            onChangeText={handleSearchChange}
            accessibilityLabel={t('appointment.searchClientPlaceholder')}
          />
        </View>

        {searchTerm.trim().length >= 2 ? (
          searching ? (
            <RowListSkeleton count={4} style={styles.skeleton} />
          ) : results.length === 0 ? (
            <EmptyState compact icon="search" title={t('appointment.noResults')} subtitle={t('appointment.noResultsHint')} />
          ) : (
            <ListGroup>
              {results.map((result) => {
                const name = clientDisplayName(result.first_name, result.last_name, result.email);
                return (
                  <ListRow
                    key={result.id}
                    title={name}
                    subtitle={result.email}
                    leading={<StaffAvatar imagePath={null} name={name} size={40} />}
                    chevron={false}
                    onPress={() => selectClient(result)}
                  />
                );
              })}
            </ListGroup>
          )
        ) : (
          <View>
            <SectionHeader title={t('appointment.recentClients')} />
            {recentClientsLoading ? (
              <RowListSkeleton count={5} style={styles.skeleton} />
            ) : recentClients.length === 0 ? (
              <EmptyState compact icon="peopleOutline" title={t('appointment.noResults')} subtitle={t('appointment.noResultsHint')} />
            ) : (
              <View style={styles.recent}>
                <ListGroup>
                  {visibleRecentClients.map((client) => {
                    const name = clientDisplayName(client.first_name, client.last_name, client.email ?? '');
                    return (
                      <ListRow
                        key={client.id}
                        title={name}
                        subtitle={client.email || null}
                        leading={<StaffAvatar imagePath={null} name={name} size={40} />}
                        chevron={false}
                        onPress={() =>
                          selectClient({ id: client.id, first_name: client.first_name, last_name: client.last_name, email: client.email ?? '' })
                        }
                      />
                    );
                  })}
                </ListGroup>
                {!showAllRecent && recentClients.length > RECENT_CLIENTS_COLLAPSED_COUNT ? (
                  <Button label={t('appointment.showMore')} variant="ghost" size="medium" onPress={() => setShowAllRecent(true)} />
                ) : null}
              </View>
            )}
          </View>
        )}

        <ListGroup>
          <ListRow
            title={t('appointment.addNewClient')}
            subtitle={t('appointment.addNewClientHint')}
            icon="personAdd"
            onPress={() => router.push('/appointment-new/new-client')}
          />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Design.screenPadding, paddingTop: 24, paddingBottom: 32, gap: 16 },
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Design.controlRadius,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  skeleton: { paddingHorizontal: 0 },
  recent: { gap: 4 },
});
