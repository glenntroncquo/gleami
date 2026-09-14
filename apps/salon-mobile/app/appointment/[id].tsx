import { SwipeableRow } from '@/components/swipeable-row';
import { deleteClientNote } from '@/lib/api/clients';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
import { useCheckout } from '@/contexts/checkout-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cancelAppointment } from '@/lib/api/appointment-cancel';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { fetchAppointmentById, fetchClientAppointments, type AppointmentRow } from '@/lib/api/calendar';
import { addClientNote, Client, ClientNote, fetchClient, fetchClientNotes } from '@/lib/api/clients';
import { fetchAppointmentPaymentStatuses, type AppointmentPaymentStatus } from '@/lib/api/orders';
import { getInitialsFromLabel } from '@/lib/text';

import { appointmentToEvent, visitDurationMinutes } from '@/components/calendar/calendar-data';
import { getListHeaderLabel, toDateKey, toDateKeyFromSalonClock } from '@/components/calendar/date-utils';
import { EventItem } from '@/components/calendar/types';

export default function AppointmentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { prepareCheckout } = useCheckout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [event, setEvent] = React.useState<EventItem | null>(null);
  const [appointment, setAppointment] = React.useState<AppointmentRow | null>(null);
  const [client, setClient] = React.useState<Client | null>(null);
  const [notes, setNotes] = React.useState<ClientNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [noteComposerOpen, setNoteComposerOpen] = React.useState(false);
  const [addingNote, setAddingNote] = React.useState(false);
  const [paymentStatuses, setPaymentStatuses] = React.useState<Record<string, AppointmentPaymentStatus>>({});
  const [history, setHistory] = React.useState<EventItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [cancelling, setCancelling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (locationLoading) return;
    setLoading(true);
    try {
      const appointment = await fetchAppointmentById(id);
      if (!appointment) {
        setError(t('client.failedToLoad'));
        return;
      }
      const nextEvent = appointmentToEvent(appointment);
      setAppointment(appointment);
      setEvent(nextEvent);

      const clientId = nextEvent.clientId;
      if (clientId && companyId) {
        const [clientData, notesData, appointmentsData] = await Promise.all([
          fetchClient(clientId),
          fetchClientNotes(clientId, companyId),
          locationId ? fetchClientAppointments(clientId, companyId, locationId) : Promise.resolve([]),
        ]);
        setClient(clientData);
        setNotes(notesData);
        const historyEvents = appointmentsData.map(appointmentToEvent).filter((item) => item.appointmentId !== nextEvent.appointmentId);
        setHistory(historyEvents);
        // A failed payment lookup must not hide the appointment or imply unpaid.
        setPaymentStatuses(await fetchAppointmentPaymentStatuses(companyId, historyEvents.map((item) => item.appointmentId)).catch(() => ({})));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, locationLoading, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const deletingNotes = React.useRef(new Set<string>());
  const handleDeleteNote = async (noteId: string) => {
    const clientId = event?.clientId;
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
    const clientId = event?.clientId;
    if (!trimmed || !clientId || !companyId) return;
    setAddingNote(true);
    try {
      await addClientNote(clientId, companyId, trimmed);
      setNewNote('');
      setNoteComposerOpen(false);
      const notesData = await fetchClientNotes(clientId, companyId);
      setNotes(notesData);
    } catch {
      setError(t('client.failedToAddNote'));
    } finally {
      setAddingNote(false);
    }
  };

  const handleCancel = () => {
    const clientId = event?.clientId ?? appointment?.client_id;
    const company = appointment?.company_id ?? companyId;
    const shopId = appointment?.location_id ?? locationId;
    if (!event || !clientId || !company) {
      setError(t('appointment.cancelFailed'));
      return;
    }

    Alert.alert(t('appointment.cancelConfirmTitle'), t('appointment.cancelConfirmMessage'), [
      { text: t('appointment.cancel'), style: 'cancel' },
      {
        text: t('appointment.cancelConfirmAction'),
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelAppointment({
              appointmentId: event.appointmentId,
              clientId,
              companyId: company,
              locationId: shopId,
            });
            DeviceEventEmitter.emit('calendarRefreshAppointments', { appointmentId: event.appointmentId });
            router.back();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('appointment.cancelFailed'));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const serviceNames = appointment?.appointment_segment.flatMap((segment) => segment.service?.name ? [segment.service.name] : []) ?? [];
  const duration = event ? visitDurationMinutes(event) : 0;

  const canceled = event?.canceled || (appointment ? isAppointmentCanceled(appointment) : false);
  const clientDisplayName =
    client && (client.first_name || client.last_name)
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
      : (event?.clientName ?? '');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.detailTitle'),
          headerShadowVisible: false,
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          unstable_headerRightItems: () =>
            event && appointment && !canceled ? [
              {
                type: 'button',
                label: t('checkout.title'),
                icon: { type: 'sfSymbol', name: 'creditcard' },
                tintColor: theme.tint,
                onPress: () => {
                  prepareCheckout(appointment);
                  router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
                },
              },
            ] : [],
          headerRight: () =>
            event && appointment && !canceled ? (
              <HeaderButton
                onPress={() => {
                  prepareCheckout(appointment);
                  router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
                }}
                hitSlop={8}>
                <AppIcon name="pointOfSale" size={22} color={theme.tint} />
              </HeaderButton>
            ) : null,
        }}
      />

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.muted} />
        </View>
      ) : !event ? (
        <EmptyState icon="eventBusy" title={error ?? t('client.failedToLoad')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <View style={styles.summaryHeading}>
              <Text style={[styles.appointmentTitle, { color: theme.text }]}>{serviceNames[0] ?? event.label}</Text>
              {serviceNames.length > 1 ? (
                <Text style={[styles.serviceSubtitle, { color: theme.muted }]}>{serviceNames.slice(1).join(' · ')}</Text>
              ) : null}
            </View>
            <View style={styles.detailRow}>
              <AppIcon name="calendar" size={21} color={theme.text} />
              <Text style={[styles.detailText, { color: theme.muted }]}>{getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))}</Text>
            </View>
            <View style={styles.detailRow}>
              <AppIcon name="schedule" size={21} color={theme.text} />
              <Text style={[styles.detailText, { color: theme.muted }]}>
                {`${event.startTime}–${event.endTime}${duration > 0 ? `  (${duration} ${t('appointment.minutesShort')})` : ''}`}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <AppIcon name="person" size={21} color={theme.text} />
              <Text style={[styles.detailText, { color: theme.muted }]}>{event.staffName}</Text>
            </View>
            {canceled ? <Text style={[styles.canceledBadge, { color: theme.error }]}>{t('appointment.canceled')}</Text> : null}
          </View>

          {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}

          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('appointment.client')}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!event.clientId}
              style={styles.clientRow}
              onPress={() => {
                if (event.clientId) router.push({ pathname: '/client/[id]', params: { id: event.clientId } });
              }}>
              <View style={[styles.clientAvatar, { backgroundColor: theme.surface }]}>
                <Text style={[styles.clientAvatarText, { color: theme.text }]}>{getInitialsFromLabel(clientDisplayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.clientName, { color: theme.text }]}>{clientDisplayName}</Text>
                {client?.email ? <Text style={[styles.clientDetail, { color: theme.muted }]}>{client.email}</Text> : null}
                {client?.phone ? <Text style={[styles.clientDetail, { color: theme.muted }]}>{client.phone}</Text> : null}
              </View>
              {event.clientId ? <AppIcon name="chevronRight" size={20} color={theme.muted} /> : null}
            </Pressable>
          </View>

          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('client.notes')}</Text>

            {notes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>{t('client.noNotes')}</Text>
            ) : (
              <ScrollView style={styles.notesList} nestedScrollEnabled showsVerticalScrollIndicator>
                {notes.map((note) => (
                <SwipeableRow key={note.id} deleteLabel={t('common.delete')} onDelete={() => handleDeleteNote(note.id)}>
                <View style={[styles.noteRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.noteText, { color: theme.text }]}>{note.note}</Text>
                  <Text style={[styles.noteDate, { color: theme.muted }]}>
                    {getListHeaderLabel(toDateKey(new Date(note.created_at)))}
                  </Text>
                </View>
                </SwipeableRow>
                ))}
              </ScrollView>
            )}
            {event.clientId ? (noteComposerOpen ? (
            <View style={styles.addNoteRow}>
              <TextInput
                autoFocus
                multiline
                accessibilityLabel={t('client.addNotePlaceholder')}
                style={[styles.input, { borderColor: theme.border, color: theme.text, flex: 1, marginBottom: 0 }]}
                placeholder={t('client.addNotePlaceholder')}
                placeholderTextColor={theme.muted}
                value={newNote}
                onChangeText={setNewNote}
              />
              <Pressable style={[styles.addNoteButton, { borderColor: theme.border }]} onPress={handleAddNote} disabled={addingNote || !newNote.trim()}>
                {addingNote ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Text style={[styles.addNoteButtonText, { color: theme.text }]}>{t('client.addNote')}</Text>
                )}
              </Pressable>
            </View>
            ) : (
              <Pressable accessibilityRole="button" style={styles.noteAction} onPress={() => setNoteComposerOpen(true)}>
                <View style={[styles.noteActionIcon, { backgroundColor: theme.surface }]}>
                  <AppIcon name="add" size={21} color={theme.text} />
                </View>
                <Text style={[styles.detailText, { color: theme.text }]}>{t('appointment.addNoteAction')}</Text>
              </Pressable>
            )) : null}
          </View>

          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t('client.history')}</Text>
            {history.length === 0 ? (
              <EmptyState
                compact
                icon="eventBusy"
                title={t('client.noHistory')}
                subtitle={t('client.noHistoryHint')}
              />
            ) : (
              <ScrollView style={styles.historyList} nestedScrollEnabled showsVerticalScrollIndicator>
              {history.map((historyEvent) => (
                <Pressable key={historyEvent.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/appointment/[id]', params: { id: historyEvent.appointmentId } })} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={[styles.historyTitle, { color: theme.text }]}>{historyEvent.label}</Text>
                    <Text style={[styles.historySubtitle, { color: theme.muted }]}>
                      {`${getListHeaderLabel(toDateKeyFromSalonClock(historyEvent.startISO))} · ${historyEvent.startTime}–${historyEvent.endTime}`}
                    </Text>
                  </View>
                  <View style={[styles.paymentBadge, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.paymentBadgeText, { color: paymentStatuses[historyEvent.appointmentId] === 'paid' ? theme.text : theme.muted }]}>
                      {t(`order.status.${paymentStatuses[historyEvent.appointmentId] ?? 'unknown'}`)}
                    </Text>
                  </View>
                  <AppIcon name="chevronRight" size={16} color={theme.muted} />
                </Pressable>
              ))}
              </ScrollView>
            )}
          </View>

          {!canceled ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.cancelButton, { backgroundColor: `${theme.error}12` }]}
              onPress={handleCancel}
              disabled={cancelling}>
              {cancelling ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Text style={[styles.cancelButtonText, { color: theme.error }]}>{t('appointment.cancelAppointment')}</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 20,
    gap: 16,
  },
  summaryHeading: { gap: 4, marginBottom: 4 },
  serviceSubtitle: { fontSize: 14, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  noteAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  noteActionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  section: {
    gap: 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  appointmentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorBar: {
    width: 4,
    borderRadius: 2,
  },
  appointmentTitle: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    fontWeight: '700',
  },
  appointmentSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    aspectRatio: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
  },
  clientDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addNoteButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addNoteButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
  },
  notesList: { maxHeight: 180 },
  noteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  noteText: {
    fontSize: 14,
  },
  noteDate: {
    fontSize: 12,
    marginTop: 2,
  },
  historyList: { maxHeight: 180 },
  paymentBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, flexShrink: 0 },
  paymentBadgeText: { fontSize: 11, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  canceledBadge: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 0,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
