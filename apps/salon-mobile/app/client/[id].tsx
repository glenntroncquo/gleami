import { SwipeableRow } from '@/components/swipeable-row';
import { deleteClientNote } from '@/lib/api/clients';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { HeaderButton } from '@/components/header-button';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchClientAppointments } from '@/lib/api/calendar';
import {
  Client,
  ClientNote,
  addClientNote,
  fetchClient,
  fetchClientNotes,
  updateClient,
} from '@/lib/api/clients';
import { getInitialsFromLabel } from '@/lib/text';

import { appointmentToEvent } from '@/components/calendar/calendar-data';
import { getListHeaderLabel, toDateKey, toDateKeyFromSalonClock } from '@/components/calendar/date-utils';
import { EventItem } from '@/components/calendar/types';

export default function ClientDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [client, setClient] = React.useState<Client | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [notes, setNotes] = React.useState<ClientNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [addingNote, setAddingNote] = React.useState(false);

  const [history, setHistory] = React.useState<EventItem[]>([]);

  const [isEditing, setIsEditing] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    try {
      const [clientData, notesData, appointmentsData] = await Promise.all([
        fetchClient(id),
        fetchClientNotes(id, companyId),
        locationId ? fetchClientAppointments(id, companyId, locationId) : Promise.resolve([]),
      ]);
      setClient(clientData);
      setNotes(notesData);
      setHistory(appointmentsData.map(appointmentToEvent));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, locationLoading, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const startEditing = () => {
    setFirstName(client?.first_name ?? '');
    setLastName(client?.last_name ?? '');
    setEmail(client?.email ?? '');
    setPhone(client?.phone ?? '');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateClient(id, { firstName, lastName, email, phone });
      await load();
      setIsEditing(false);
    } catch {
      setError(t('client.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const deletingNotes = React.useRef(new Set<string>());
  const handleDeleteNote = async (noteId: string) => {
    const clientId = id;
    if (!clientId || !companyId || deletingNotes.current.has(noteId)) return;
    deletingNotes.current.add(noteId);
    try {
      await deleteClientNote(noteId, clientId, companyId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch {
      setError(t('client.failedToDeleteNote'));
    } finally {
      deletingNotes.current.delete(noteId);
    }
  };

  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || !id || !companyId) return;
    setAddingNote(true);
    try {
      await addClientNote(id, companyId, trimmed);
      setNewNote('');
      const notesData = await fetchClientNotes(id, companyId);
      setNotes(notesData);
    } catch {
      setError(t('client.failedToAddNote'));
    } finally {
      setAddingNote(false);
    }
  };

  const name = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || client.email || '' : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: name || t('client.title'),
          headerTintColor: theme.text,
          unstable_headerRightItems: () => [{
            type: 'button',
            label: t(isEditing ? 'client.save' : 'client.edit'),
            tintColor: theme.text,
            disabled: isEditing && saving,
            onPress: isEditing ? handleSaveProfile : startEditing,
          }],
          headerRight: () =>
            isEditing ? (
              <HeaderButton onPress={handleSaveProfile} disabled={saving} hitSlop={8}>
                {saving ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={styles.saveText}>{t('client.save')}</Text>
                )}
              </HeaderButton>
            ) : (
              <HeaderButton onPress={startEditing} hitSlop={8}>
                <Text style={styles.saveText}>{t('client.edit')}</Text>
              </HeaderButton>
            ),
        }}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitialsFromLabel(name)}</Text>
            </View>

            {isEditing ? (
              <View style={{ width: '100%' }}>
                <TextInput
                  style={styles.input}
                  placeholder={t('client.firstName')}
                  placeholderTextColor={theme.muted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.lastName')}
                  placeholderTextColor={theme.muted}
                  value={lastName}
                  onChangeText={setLastName}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.email')}
                  placeholderTextColor={theme.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('client.phone')}
                  placeholderTextColor={theme.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <>
                {client?.email ? <Text style={styles.profileLine}>{client.email}</Text> : null}
                {client?.phone ? <Text style={styles.profileLine}>{client.phone}</Text> : null}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('client.notes')}</Text>
            <View style={styles.addNoteRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={t('client.addNotePlaceholder')}
                placeholderTextColor={theme.muted}
                value={newNote}
                onChangeText={setNewNote}
              />
              <Pressable style={styles.addNoteButton} onPress={handleAddNote} disabled={addingNote}>
                {addingNote ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={styles.addNoteButtonText}>{t('client.addNote')}</Text>
                )}
              </Pressable>
            </View>
            {notes.length === 0 ? (
              <EmptyState compact title={t('client.noNotes')} subtitle={t('client.noNotesHint')} />
            ) : (
              <ScrollView style={styles.notesList} nestedScrollEnabled showsVerticalScrollIndicator>
                {notes.map((note) => (
                <SwipeableRow key={note.id} deleteLabel={t('common.delete')} onDelete={() => handleDeleteNote(note.id)}>
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.noteDate}>{getListHeaderLabel(toDateKey(new Date(note.created_at)))}</Text>
                </View>
                </SwipeableRow>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('client.history')}</Text>
            {history.length === 0 ? (
              <EmptyState
                compact
                icon="eventBusy"
                title={t('client.noHistory')}
                subtitle={t('client.noHistoryHint')}
              />
            ) : (
              history.map((event) => (
                <View key={event.appointmentId} style={styles.historyRow}>
                  <View style={[styles.historyColorBar, { backgroundColor: event.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{event.label}</Text>
                    <Text style={styles.historySubtitle}>
                      {`${getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))} · ${event.startTime}–${event.endTime} · ${event.staffName}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
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
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.tint,
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
      paddingBottom: 48,
      gap: 24,
    },
    profileSection: {
      alignItems: 'center',
      gap: 6,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.muted,
    },
    profileLine: {
      fontSize: 14,
      color: theme.muted,
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
    input: {
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      marginBottom: 8,
    },
    addNoteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addNoteButton: {
      minHeight: Design.touchTarget,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.text,
    },
    addNoteButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
    },
    notesList: { maxHeight: 180 },
  noteRow: {
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    noteText: {
      fontSize: 14,
      color: theme.text,
    },
    noteDate: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
    historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    historyColorBar: {
      width: 4,
      height: 32,
      borderRadius: 2,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    historySubtitle: {
      fontSize: 12,
      color: theme.muted,
      marginTop: 2,
    },
  });
