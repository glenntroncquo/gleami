import { useAppointmentPayments } from '@/hooks/use-appointment-payments';
import { SwipeableRow } from '@/components/swipeable-row';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { HeaderButton } from '@/components/header-button';
import { Button, DetailRow, FormFooter, ListGroup, ListRow, SectionHeader, TextField } from '@/components/ui';
import type { AppointmentPaymentInfo } from '@/lib/api/orders';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DetailSkeleton } from '@/components/content-skeletons';
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
  deleteClientNote,
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
  const router = useRouter();
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
  const paymentStatuses = useAppointmentPayments(companyId, history.map(event => event.appointmentId));

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
      const historyEvents = appointmentsData.map((appointment) => appointmentToEvent(appointment, colorScheme));
      setHistory(historyEvents);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, locationLoading, t, colorScheme]);

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
          unstable_headerRightItems: () => isEditing ? [] : [{
            type: 'button',
            label: t('client.edit'),
            tintColor: theme.text,
            onPress: startEditing,
          }],
          headerRight: () =>
            isEditing ? null : (
              <HeaderButton onPress={startEditing} hitSlop={8} style={styles.headerTextButton}>
                <Text style={styles.headerText}>{t('client.edit')}</Text>
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
        <DetailSkeleton />
      ) : (
        <>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitialsFromLabel(name)}</Text>
            </View>
            {name ? <Text style={styles.profileName}>{name}</Text> : null}
          </View>

          {isEditing ? (
            <View style={styles.form}>
              <TextField label={t('client.firstName')} value={firstName} onChangeText={setFirstName} />
              <TextField label={t('client.lastName')} value={lastName} onChangeText={setLastName} />
              <TextField
                label={t('client.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField label={t('client.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          ) : (
            <ListGroup>
              <DetailRow label={t('client.email')} value={client?.email} />
              <DetailRow label={t('client.phone')} value={client?.phone} />
            </ListGroup>
          )}

          <View>
            <SectionHeader title={t('client.history')} />
            {history.length === 0 ? (
              <EmptyState
                compact
                icon="eventBusy"
                title={t('client.noHistory')}
                subtitle={t('client.noHistoryHint')}
              />
            ) : (
              <View style={styles.scrollGroup}>
              <ScrollView style={styles.historyList} nestedScrollEnabled showsVerticalScrollIndicator>
              <ListGroup style={styles.innerGroup} inset={32}>
              {history.map((event) => {
                const payment = paymentStatuses[event.appointmentId];
                const badgeColors: Record<AppointmentPaymentInfo['status'], { background: string; text: string }> = {
                  paid: { background: theme.successSurface, text: theme.success },
                  partial: { background: theme.warningSurface, text: theme.warning },
                  unpaid: { background: theme.surfaceRaised, text: theme.muted },
                };
                const badge = badgeColors[payment?.status ?? 'unpaid'];
                const badgeLabel =
                  payment?.status === 'paid' || payment?.status === 'partial'
                    ? `€${(payment.amountPaid ?? 0).toFixed(2)}`
                    : t(`order.status.${payment?.status ?? 'unpaid'}`);
                return (
                <ListRow
                  key={event.appointmentId}
                  title={event.label}
                  subtitle={`${getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))} · ${event.startTime}–${event.endTime} · ${event.staffName}`}
                  leading={<View style={[styles.historyColorBar, { backgroundColor: event.color }]} />}
                  trailing={
                    <View style={[styles.paymentBadge, { backgroundColor: badge.background }]}>
                      <Text style={[styles.paymentBadgeText, { color: badge.text }]}>{badgeLabel}</Text>
                    </View>
                  }
                  onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })}
                />
                );
              })}
              </ListGroup>
              </ScrollView>
              </View>
            )}
          </View>

          <View>
            <SectionHeader title={t('client.notes')} />
            <View style={styles.addNoteRow}>
              <TextField
                containerStyle={styles.flex}
                placeholder={t('client.addNotePlaceholder')}
                value={newNote}
                onChangeText={setNewNote}
              />
              <Button
                label={t('client.addNote')}
                variant="secondary"
                onPress={handleAddNote}
                disabled={addingNote}
                style={styles.addNoteButton}
              />
            </View>
            {notes.length === 0 ? (
              <EmptyState compact title={t('client.noNotes')} subtitle={t('client.noNotesHint')} />
            ) : (
              <View style={styles.scrollGroup}>
              <ScrollView style={styles.notesList} nestedScrollEnabled showsVerticalScrollIndicator>
                <ListGroup style={styles.innerGroup} inset={14}>
                {notes.map((note) => (
                <SwipeableRow key={note.id} deleteLabel={t('common.delete')} onDelete={() => handleDeleteNote(note.id)}>
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <Text style={styles.noteDate}>{getListHeaderLabel(toDateKey(new Date(note.created_at)))}</Text>
                </View>
                </SwipeableRow>
                ))}
                </ListGroup>
              </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
        {isEditing ? (
          <FormFooter>
            <Button label={t('client.save')} onPress={handleSaveProfile} loading={saving} />
          </FormFooter>
        ) : null}
        </>
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
    flex: { flex: 1 },
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.tint,
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
    scrollContent: {
      paddingHorizontal: Design.screenPadding,
      paddingTop: 16,
      paddingBottom: 48,
      gap: 24,
    },
    profileSection: {
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.blueTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.text,
    },
    profileName: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    form: { gap: 16 },
    addNoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },
    addNoteButton: { height: 50, paddingHorizontal: 16 },
    // Keep the card's rounded edges fixed while its rows scroll.
    scrollGroup: {
      backgroundColor: theme.card,
      borderRadius: Design.cardRadius,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
    innerGroup: { borderWidth: 0, borderRadius: 0 },
    notesList: { maxHeight: 220 },
    noteRow: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: theme.card,
    },
    noteText: {
      fontSize: 15,
      color: theme.text,
    },
    noteDate: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    historyList: { maxHeight: 280 },
    historyColorBar: {
      width: 4,
      height: 32,
      borderRadius: 2,
    },
    paymentBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, flexShrink: 0 },
    paymentBadgeText: { fontSize: 11, fontWeight: '600' },
  });
