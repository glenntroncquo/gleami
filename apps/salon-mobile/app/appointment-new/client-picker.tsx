import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { StaffAvatar } from '@/components/staff-avatar';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

    if (text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchClients(text));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const selectClient = React.useCallback(
    (client: ClientSearchResult) => {
      DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.selectClient, client);
      router.back();
    },
    [router]
  );

  const visibleRecentClients = recentClients.slice(0, showAllRecent ? RECENT_CLIENTS_EXPANDED_COUNT : RECENT_CLIENTS_COLLAPSED_COUNT);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.client'),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.searchInputRow}>
          <AppIcon name="search" size={18} color={theme.muted} />
          <TextInput
            style={styles.searchInputText}
            placeholder={t('appointment.searchClientPlaceholder')}
            placeholderTextColor={theme.muted}
            value={searchTerm}
            onChangeText={handleSearchChange}
          />
        </View>

        {searchTerm.trim().length >= 2 ? (
          searching ? (
            <ActivityIndicator style={styles.inlineSpinner} color={theme.muted} />
          ) : results.length === 0 ? (
            <EmptyState compact icon="search" title={t('appointment.noResults')} subtitle={t('appointment.noResultsHint')} />
          ) : (
            <View>
              {results.map((result) => (
                <Pressable key={result.id} style={styles.row} onPress={() => selectClient(result)}>
                  <StaffAvatar imagePath={null} name={clientDisplayName(result.first_name, result.last_name, result.email)} size={40} />
                  <View style={styles.flexFill}>
                    <Text style={styles.rowName}>{clientDisplayName(result.first_name, result.last_name, result.email)}</Text>
                    <Text style={styles.rowMeta}>{result.email}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : (
          <View>
            <Text style={styles.listLabel}>{t('appointment.recentClients')}</Text>
            {recentClientsLoading ? (
              <ActivityIndicator style={styles.inlineSpinner} color={theme.muted} />
            ) : recentClients.length === 0 ? (
              <EmptyState compact icon="peopleOutline" title={t('appointment.noResults')} subtitle={t('appointment.noResultsHint')} />
            ) : (
              <View>
                {visibleRecentClients.map((client) => (
                  <Pressable
                    key={client.id}
                    style={styles.row}
                    onPress={() =>
                      selectClient({ id: client.id, first_name: client.first_name, last_name: client.last_name, email: client.email ?? '' })
                    }>
                    <StaffAvatar imagePath={null} name={clientDisplayName(client.first_name, client.last_name, client.email ?? '')} size={40} />
                    <View style={styles.flexFill}>
                      <Text style={styles.rowName}>{clientDisplayName(client.first_name, client.last_name, client.email ?? '')}</Text>
                      {client.email ? <Text style={styles.rowMeta}>{client.email}</Text> : null}
                    </View>
                  </Pressable>
                ))}
                {!showAllRecent && recentClients.length > RECENT_CLIENTS_COLLAPSED_COUNT ? (
                  <Pressable onPress={() => setShowAllRecent(true)} style={styles.showMoreRow}>
                    <Text style={styles.headerLinkText}>{t('appointment.showMore')}</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        )}

        <Pressable style={styles.newClientRow} onPress={() => router.push('/appointment-new/new-client')}>
          <View style={styles.newClientRowIcon}>
            <AppIcon name="personAdd" size={18} color={theme.muted} />
          </View>
          <View style={styles.flexFill}>
            <Text style={styles.rowName}>{t('appointment.addNewClient')}</Text>
            <Text style={styles.rowMeta}>{t('appointment.addNewClientHint')}</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: typeof Colors.light) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flexFill: {
      flex: 1,
    },
    headerLinkText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.tint,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchInputText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      padding: 0,
    },
    inlineSpinner: {
      marginTop: 8,
    },
    listLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.muted,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowMeta: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    showMoreRow: {
      paddingVertical: 8,
    },
    newClientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingTop: 14,
      marginTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    newClientRowIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
  });
}
