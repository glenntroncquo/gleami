import { useAppointmentPayments } from '@/hooks/use-appointment-payments';
import { SwipeableRow } from '@/components/swipeable-row';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DetailSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Button, ErrorBanner, ListGroup, ListRow, SectionHeader, TextField } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
import type { AppointmentPaymentInfo } from '@/lib/api/orders';
import { useCheckout } from '@/contexts/checkout-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { cancelAppointment } from '@/lib/api/appointment-cancel';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import { fetchAppointmentById, fetchClientAppointments, type AppointmentRow } from '@/lib/api/calendar';
import { addClientNote, Client, ClientNote, deleteClientNote, fetchClient, fetchClientNotes } from '@/lib/api/clients';
import { getInitialsFromLabel } from '@/lib/text';

import { appointmentToEvent, visitDurationMinutes } from '@/components/calendar/calendar-data';
import { getListHeaderLabel, toDateKey, toDateKeyFromSalonClock } from '@/components/calendar/date-utils';
import { EventItem } from '@/components/calendar/types';

export default function AppointmentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { prepareCheckout } = useCheckout();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, hasPermission } = useAuth();
  const canCheckout = hasPermission('pos:manage');
  const { locationId, loading: locationLoading } = useLocation();
  const currentPayment = useAppointmentPayments(companyId, id ? [id] : []);
  const paid = currentPayment[id]?.status === 'paid';
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [event, setEvent] = React.useState<EventItem | null>(null);
  const [appointment, setAppointment] = React.useState<AppointmentRow | null>(null);
  const [client, setClient] = React.useState<Client | null>(null);
  const [notes, setNotes] = React.useState<ClientNote[]>([]);
  const [newNote, setNewNote] = React.useState('');
  const [noteComposerOpen, setNoteComposerOpen] = React.useState(false);
  const [addingNote, setAddingNote] = React.useState(false);
  const [history, setHistory] = React.useState<EventItem[]>([]);
  const paymentStatuses = useAppointmentPayments(companyId, history.map(event => event.appointmentId));
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
      const nextEvent = appointmentToEvent(appointment, colorScheme);
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
        const historyEvents = appointmentsData.map((row) => appointmentToEvent(row, colorScheme)).filter((item) => item.appointmentId !== nextEvent.appointmentId);
        setHistory(historyEvents);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('client.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, locationLoading, t, colorScheme]);

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
            canCheckout && event && appointment && !canceled ? paid ? [{
              type: 'custom',
              hidesSharedBackground: true,
              element: <HeaderButton disabled accessibilityLabel={t('order.status.paid')} style={{ backgroundColor: theme.successSurface }}><AppIcon name="pointOfSale" size={22} color={theme.success} /></HeaderButton>,
            }] : [
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
            canCheckout && event && appointment && !canceled ? (
              <HeaderButton
                disabled={paid}
                accessibilityLabel={paid ? t('order.status.paid') : t('checkout.title')}
                style={paid ? { backgroundColor: theme.successSurface } : undefined}
                onPress={() => {
                  if (paid) return;
                  prepareCheckout(appointment);
                  router.push({ pathname: '/checkout/[appointmentId]', params: { appointmentId: event.appointmentId } });
                }}
                hitSlop={8}>
                <AppIcon name="pointOfSale" size={22} color={paid ? theme.success : theme.tint} />
              </HeaderButton>
            ) : null,
        }}
      />

      {loading ? (
        <DetailSkeleton />
      ) : !event ? (
        <EmptyState icon="eventBusy" title={error ?? t('client.failedToLoad')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.summaryHeading}>
            <Text style={[styles.appointmentTitle, { color: theme.text }]}>{serviceNames[0] ?? event.label}</Text>
            {serviceNames.length > 1 ? (
              <Text style={[styles.serviceSubtitle, { color: theme.muted }]}>{serviceNames.slice(1).join(' · ')}</Text>
            ) : null}
            {canceled ? (
              <View style={[styles.canceledBadge, { backgroundColor: theme.errorSurface }]}>
                <Text style={[styles.canceledBadgeText, { color: theme.error }]}>{t('appointment.canceled')}</Text>
              </View>
            ) : null}
          </View>

          <ListGroup>
            <ListRow icon="calendar" title={getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))} />
            <ListRow
              icon="schedule"
              title={`${event.startTime}–${event.endTime}`}
              value={duration > 0 ? `${duration} ${t('appointment.minutesShort')}` : null}
            />
            <ListRow icon="person" title={event.staffName} />
          </ListGroup>

          <ErrorBanner message={error} />

          <View>
            <SectionHeader title={t('appointment.client')} />
            <ListGroup>
              <ListRow
                title={clientDisplayName}
                subtitle={[client?.email, client?.phone].filter(Boolean).join(' · ')}
                leading={
                  <View style={[styles.clientAvatar, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.clientAvatarText, { color: theme.text }]}>{getInitialsFromLabel(clientDisplayName)}</Text>
                  </View>
                }
                onPress={event.clientId ? () => router.push({ pathname: '/client/[id]', params: { id: event.clientId! } }) : undefined}
              />
            </ListGroup>
          </View>

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
              <View style={[styles.scrollGroup, { borderColor: theme.border }]}>
              <ScrollView style={styles.historyList} nestedScrollEnabled showsVerticalScrollIndicator>
              <ListGroup style={styles.innerGroup} inset={32}>
              {history.map((historyEvent) => {
                const payment = paymentStatuses[historyEvent.appointmentId];
                const badgeColors: Record<AppointmentPaymentInfo['status'], { background: string; text: string }> = {
                  paid: { background: theme.successSurface, text: theme.success },
                  partial: { background: theme.warningSurface, text: theme.warning },
                  unpaid: { background: theme.surface, text: theme.muted },
                };
                const badge = badgeColors[payment?.status ?? 'unpaid'];
                const badgeLabel =
                  payment?.status === 'paid' || payment?.status === 'partial'
                    ? `€${(payment.amountPaid ?? 0).toFixed(2)}`
                    : t(`order.status.${payment?.status ?? 'unpaid'}`);
                return (
                <ListRow
                  key={historyEvent.id}
                  title={historyEvent.label}
                  subtitle={`${getListHeaderLabel(toDateKeyFromSalonClock(historyEvent.startISO))} · ${historyEvent.startTime}–${historyEvent.endTime}`}
                  leading={<View style={[styles.historyColorBar, { backgroundColor: historyEvent.color }]} />}
                  trailing={
                    <View style={[styles.paymentBadge, { backgroundColor: badge.background }]}>
                      <Text style={[styles.paymentBadgeText, { color: badge.text }]}>{badgeLabel}</Text>
                    </View>
                  }
                  onPress={() => router.replace({ pathname: '/appointment/[id]', params: { id: historyEvent.appointmentId } })}
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
            {notes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>{t('client.noNotes')}</Text>
            ) : (
              <View style={[styles.scrollGroup, { borderColor: theme.border }]}>
              <ScrollView style={styles.notesList} nestedScrollEnabled showsVerticalScrollIndicator>
                <ListGroup style={styles.innerGroup} inset={14}>
                {notes.map((note) => (
                <SwipeableRow key={note.id} deleteLabel={t('common.delete')} onDelete={() => handleDeleteNote(note.id)}>
                <View style={[styles.noteRow, { backgroundColor: theme.background }]}>
                  <Text style={[styles.noteText, { color: theme.text }]}>{note.note}</Text>
                  <Text style={[styles.noteDate, { color: theme.muted }]}>
                    {getListHeaderLabel(toDateKey(new Date(note.created_at)))}
                  </Text>
                </View>
                </SwipeableRow>
                ))}
                </ListGroup>
              </ScrollView>
              </View>
            )}
            {event.clientId ? (noteComposerOpen ? (
            <View style={styles.addNoteRow}>
              <TextField
                autoFocus
                multiline
                containerStyle={styles.flex}
                accessibilityLabel={t('client.addNotePlaceholder')}
                style={styles.noteInput}
                placeholder={t('client.addNotePlaceholder')}
                value={newNote}
                onChangeText={setNewNote}
              />
              <Button
                label={t('client.addNote')}
                variant="secondary"
                onPress={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                style={styles.addNoteButton}
              />
            </View>
            ) : (
              <Button
                label={t('appointment.addNoteAction')}
                icon="add"
                variant="secondary"
                size="medium"
                onPress={() => setNoteComposerOpen(true)}
                style={styles.noteAction}
              />
            )) : null}
          </View>

          {!canceled ? (
            <Button
              label={t('appointment.cancelAppointment')}
              variant="destructive"
              onPress={handleCancel}
              loading={cancelling}
            />
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
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Design.screenPadding,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  summaryHeading: { gap: 4, alignItems: 'flex-start' },
  serviceSubtitle: { fontSize: 15, lineHeight: 21 },
  appointmentTitle: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontWeight: '700',
  },
  canceledBadge: {
    marginTop: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  canceledBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // The group's rounded border stays fixed while its rows scroll inside it.
  scrollGroup: {
    borderWidth: 1,
    borderRadius: Design.cardRadius - 4,
    overflow: 'hidden',
  },
  innerGroup: { borderWidth: 0, borderRadius: 0 },
  historyList: { maxHeight: 280 },
  historyColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  paymentBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, flexShrink: 0 },
  paymentBadgeText: { fontSize: 11, fontWeight: '600' },
  emptyText: {
    fontSize: 14,
    paddingHorizontal: 4,
  },
  notesList: { maxHeight: 220 },
  noteRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteText: {
    fontSize: 15,
  },
  noteDate: {
    fontSize: 13,
    marginTop: 2,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  noteInput: { minHeight: 50 },
  addNoteButton: { height: 50, paddingHorizontal: 16 },
  noteAction: { marginTop: 12, alignSelf: 'flex-start' },
});
