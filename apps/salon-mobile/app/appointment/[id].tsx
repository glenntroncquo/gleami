import { SwipeableRow } from '@/components/swipeable-row';
import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Pressable } from '@/components/pressable-scale';
import { AppointmentPaymentPanel } from '@/components/appointment-payment-panel';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { DetailSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Button, DetailRow, ErrorBanner, ListGroup, ListRow, SectionHeader, TextField } from '@/components/ui';
import { Colors, Design } from '@/constants/theme';
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, hasPermission } = useAuth();
  const canCheckout = hasPermission('pos:manage');
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
  const [history, setHistory] = React.useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = React.useState<DetailTab>('overview');
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

  const duration = event ? visitDurationMinutes(event) : 0;

  const canceled = event?.canceled || (appointment ? isAppointmentCanceled(appointment) : false);
  const clientDisplayName =
    client && (client.first_name || client.last_name)
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
      : (event?.clientName ?? '');
  const serviceLines = appointment?.appointment_segment.map((segment) => ({
    id: segment.id,
    name: [segment.service?.name, segment.service_variant?.name].filter(Boolean).join(' · ') || event?.label || t('appointment.detailTitle'),
    price: segment.price ?? segment.service_variant?.price ?? 0,
  })) ?? [];
  const serviceTotal = serviceLines.reduce((sum, line) => sum + line.price, 0);
  const tabs: Array<{ key: DetailTab; label: string }> = [
    { key: 'overview', label: t('appointment.tabs.overview') },
    { key: 'client', label: t('appointment.tabs.client') },
    { key: 'notes', label: t('appointment.tabs.notes') },
    { key: 'payment', label: t('appointment.tabs.payment') },
  ];

  const renderNotes = () => (
    <View style={styles.section}>
      <SectionHeader title={t('client.notes')} />
      {notes.length === 0 ? (
        <EmptyState compact title={t('client.noNotes')} subtitle={t('client.noNotesHint')} />
      ) : (
        <View style={[styles.scrollGroup, { backgroundColor: theme.card }]}>
          <ScrollView style={styles.notesList} nestedScrollEnabled showsVerticalScrollIndicator>
            <ListGroup style={styles.innerGroup} inset={14}>
              {notes.map((note) => (
                <SwipeableRow key={note.id} deleteLabel={t('common.delete')} onDelete={() => handleDeleteNote(note.id)}>
                  <View style={[styles.noteRow, { backgroundColor: theme.card }]}>
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
      {event?.clientId ? (noteComposerOpen ? (
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
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
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
            canCheckout && event && appointment && !canceled
              ? [
                  {
                    type: 'button',
                    label: t('checkout.title'),
                    icon: { type: 'sfSymbol', name: 'creditcard' },
                    tintColor: theme.tint,
                    onPress: () => {
                      router.push({
                        pathname: '/checkout/[appointmentId]',
                        params: { appointmentId: event.appointmentId },
                      });
                    },
                  },
                ]
              : [],
          headerRight: () =>
            canCheckout && event && appointment && !canceled ? (
              <HeaderButton
                accessibilityLabel={t('checkout.title')}
                onPress={() =>
                  router.push({
                    pathname: '/checkout/[appointmentId]',
                    params: { appointmentId: event.appointmentId },
                  })
                }
                hitSlop={8}>
                <AppIcon name="pointOfSale" size={22} color={theme.tint} />
              </HeaderButton>
            ) : null,
        }}
      />

      {loading ? (
        <DetailSkeleton />
      ) : !event ? (
        <EmptyState icon="eventBusy" title={error ?? t('client.failedToLoad')} />
      ) : (
        <View style={styles.tabbedContent}>
          <View style={styles.clientHeader}>
            <View style={[styles.clientAvatarLarge, { backgroundColor: theme.text }]}>
              <Text style={[styles.clientAvatarLargeText, { color: theme.background }]}>
                {getInitialsFromLabel(clientDisplayName)}
              </Text>
            </View>
            <View style={styles.clientHeaderText}>
              <Text style={[styles.clientHeaderName, { color: theme.text }]}>
                {clientDisplayName || t('calendar.unknownClient')}
              </Text>
              <Text style={[styles.clientHeaderMeta, { color: theme.muted }]}>
                {canceled ? t('appointment.canceled') : t('appointment.confirmed')}
              </Text>
            </View>
          </View>

          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tab, selected && { borderBottomColor: theme.text }]}>
                  <View style={styles.tabLabelRow}>
                    <Text style={[styles.tabLabel, { color: selected ? theme.text : theme.muted }]}>{tab.label}</Text>
                    {tab.key === 'notes' && notes.length > 0 ? (
                      <View style={[styles.tabBadge, { backgroundColor: theme.text }]}>
                        <Text style={[styles.tabBadgeText, { color: theme.background }]}>{notes.length}</Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'payment' ? (
            appointment ? (
              <AppointmentPaymentPanel
                key={appointment.id}
                appointment={appointment}
                companyId={companyId}
                canCheckout={canCheckout && !canceled}
              />
            ) : (
              <EmptyState icon="eventBusy" title={t('client.failedToLoad')} />
            )
          ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ErrorBanner message={error} />

            {activeTab === 'overview' ? (
              <>
                <View style={[styles.summaryCard, { borderColor: theme.border }]}>
                  <View style={styles.summaryCardRow}>
                    <AppIcon name="calendar" size={20} color={theme.muted} />
                    <View style={styles.summaryCardText}>
                      <Text style={[styles.summaryCardTitle, { color: theme.text }]}>
                        {`${event.startTime}–${event.endTime}`}
                      </Text>
                      <Text style={[styles.summaryCardSubtitle, { color: theme.muted }]}>
                        {getListHeaderLabel(toDateKeyFromSalonClock(event.startISO))} · {duration} {t('appointment.minutesShort')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: canceled ? theme.errorSurface : theme.successSurface }]}>
                      <Text style={[styles.statusBadgeText, { color: canceled ? theme.error : theme.success }]}>
                        {canceled ? t('appointment.canceled') : t('appointment.confirmed')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionHeader title={t('appointment.services')} />
                  {serviceLines.length === 0 ? (
                    <EmptyState compact title={t('checkout.noLineItems')} subtitle={t('checkout.noLineItemsHint')} />
                  ) : (
                    <ListGroup inset={14}>
                      {serviceLines.map((line) => (
                        <ListRow key={line.id} title={line.name} value={`€${line.price.toFixed(2)}`} />
                      ))}
                      <View style={[styles.totalRow, { backgroundColor: theme.card }]}>
                        <Text style={[styles.totalLabel, { color: theme.text }]}>{t('checkout.total')}</Text>
                        <Text style={[styles.totalValue, { color: theme.text }]}>{`€${serviceTotal.toFixed(2)}`}</Text>
                      </View>
                    </ListGroup>
                  )}
                </View>

                <View style={styles.section}>
                  <SectionHeader title={t('appointment.staffMember')} />
                  <ListGroup>
                    <ListRow icon="person" title={event.staffName} />
                  </ListGroup>
                </View>

                {!canceled ? (
                  <Button
                    label={t('appointment.cancelAppointment')}
                    variant="destructive"
                    onPress={handleCancel}
                    loading={cancelling}
                  />
                ) : null}
              </>
            ) : activeTab === 'client' ? (
              <>
                <ListGroup>
                  <DetailRow label={t('client.email')} value={client?.email} />
                  <DetailRow label={t('client.phone')} value={client?.phone} />
                </ListGroup>
                <View style={styles.section}>
                  <SectionHeader title={t('client.history')} />
                  {history.length === 0 ? (
                    <EmptyState compact icon="eventBusy" title={t('client.noHistory')} subtitle={t('client.noHistoryHint')} />
                  ) : (
                    <View style={[styles.scrollGroup, { backgroundColor: theme.card }]}>
                      <ScrollView style={styles.historyList} nestedScrollEnabled showsVerticalScrollIndicator>
                        <ListGroup style={styles.innerGroup} inset={32}>
                          {history.map((historyEvent) => (
                            <ListRow
                              key={historyEvent.id}
                              title={historyEvent.label}
                              subtitle={`${getListHeaderLabel(toDateKeyFromSalonClock(historyEvent.startISO))} · ${historyEvent.startTime}–${historyEvent.endTime}`}
                              leading={<View style={[styles.historyColorBar, { backgroundColor: historyEvent.color }]} />}
                              onPress={() => router.replace({ pathname: '/appointment/[id]', params: { id: historyEvent.appointmentId } })}
                            />
                          ))}
                        </ListGroup>
                      </ScrollView>
                    </View>
                  )}
                </View>
              </>
            ) : activeTab === 'notes' ? (
              renderNotes()
            ) : (
              null
            )}
          </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

type DetailTab = 'overview' | 'client' | 'notes' | 'payment';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: { flex: 1 },
  tabbedContent: { flex: 1 },
  tabBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: Design.screenPadding - 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabLabel: { fontSize: 12.5, fontWeight: '600' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Design.screenPadding,
    paddingTop: 12,
    paddingBottom: 10,
  },
  clientAvatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarLargeText: { fontSize: 15, fontWeight: '700' },
  clientHeaderText: { flex: 1, gap: 2 },
  clientHeaderName: { fontSize: 17, fontWeight: '700' },
  clientHeaderMeta: { fontSize: 13 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Design.screenPadding,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 24,
  },
  section: { gap: 8 },
  summaryCard: {
    borderRadius: Design.cardRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
  },
  summaryCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryCardText: { flex: 1, gap: 3 },
  summaryCardTitle: { fontSize: 17, fontWeight: '700' },
  summaryCardSubtitle: { fontSize: 13 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  totalRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.card,
  },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  // Keep the card's rounded edges fixed while its rows scroll.
  scrollGroup: {
    borderRadius: Design.cardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  innerGroup: { borderWidth: 0, borderRadius: 0 },
  historyList: { maxHeight: 280 },
  historyColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
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
