import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { StaffAvatar } from '@/components/staff-avatar';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createAppointment } from '@/lib/api/appointment-create';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';
import { ClientSearchResult } from '@/lib/api/clients';
import { COLOR_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { getMonthShortLabel } from '@/components/calendar/date-utils';
import { APPOINTMENT_DRAFT_EVENTS, CartItem, NewClientDraft } from '@/lib/appointment-draft';

function formatDateForInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function defaultStartDate(dateParam?: string, timeParam?: string) {
  const base = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  if (timeParam && /^([01]\d|2[0-3]):[0-5]\d$/.test(timeParam)) {
    const [hours, minutes] = timeParam.split(':').map(Number);
    base.setHours(hours, minutes, 0, 0);
    return base;
  }
  const now = new Date();
  let hours = now.getHours();
  let minutes = Math.ceil(now.getMinutes() / 30) * 30;
  if (minutes >= 60) {
    minutes = 0;
    hours += 1;
  }
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function clientDisplayName(first: string | null | undefined, last: string | null | undefined, fallback: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || fallback;
}

export default function NewAppointmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; time?: string; staffId?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(true);
  const [staffId, setStaffId] = React.useState<string | null>(params.staffId ?? null);
  const [cart, setCart] = React.useState<CartItem[]>([]);

  const [selectedClient, setSelectedClient] = React.useState<ClientSearchResult | null>(null);
  const [newClientDraft, setNewClientDraft] = React.useState<NewClientDraft | null>(null);

  const [startDate, setStartDate] = React.useState<Date>(() => defaultStartDate(params.date, params.time));

  const [notes, setNotes] = React.useState('');
  const [notesOpen, setNotesOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    setStaffLoading(true);
    fetchStaff(companyId, locationId)
      .then((staff) => {
        setStaffList(staff);
        setStaffId((current) => current ?? (staff.length === 1 ? staff[0].id : null));
      })
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));
  }, [companyId, locationId]);

  React.useEffect(() => {
    const clientSub = DeviceEventEmitter.addListener(APPOINTMENT_DRAFT_EVENTS.selectClient, (client: ClientSearchResult) => {
      setSelectedClient(client);
      setNewClientDraft(null);
    });
    const newClientSub = DeviceEventEmitter.addListener(APPOINTMENT_DRAFT_EVENTS.selectNewClient, (draft: NewClientDraft) => {
      setSelectedClient(null);
      setNewClientDraft(draft);
    });
    const staffSub = DeviceEventEmitter.addListener(APPOINTMENT_DRAFT_EVENTS.selectStaff, ({ staffId: id }: { staffId: string }) => {
      setStaffId(id);
      setCart((prev) => prev.map((item) => ({ ...item, staffId: id })));
    });
    const serviceSub = DeviceEventEmitter.addListener(APPOINTMENT_DRAFT_EVENTS.addService, (item: CartItem) => {
      setCart((prev) => [...prev, item]);
    });
    const removeServiceSub = DeviceEventEmitter.addListener(
      APPOINTMENT_DRAFT_EVENTS.removeService,
      ({ serviceVariantId }: { serviceVariantId: string }) => {
        setCart((prev) => {
          const index = prev.findLastIndex((item) => item.serviceVariantId === serviceVariantId);
          if (index < 0) return prev;
          return prev.filter((_, i) => i !== index);
        });
      }
    );
    const dateTimeSub = DeviceEventEmitter.addListener(
      APPOINTMENT_DRAFT_EVENTS.setDateTime,
      ({ field, value }: { field: 'date' | 'time'; value: string }) => {
        const picked = new Date(value);
        setStartDate((prev) => {
          const next = new Date(prev);
          if (field === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
          else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
          return next;
        });
      }
    );

    return () => {
      clientSub.remove();
      newClientSub.remove();
      staffSub.remove();
      serviceSub.remove();
      removeServiceSub.remove();
      dateTimeSub.remove();
    };
  }, []);

  const handleClearClient = React.useCallback(() => {
    Haptics.selectionAsync();
    setSelectedClient(null);
    setNewClientDraft(null);
  }, []);

  const totalMinutes = cart.reduce((sum, item) => sum + item.durationMinutes, 0);
  const endDate = React.useMemo(() => {
    const next = new Date(startDate);
    next.setMinutes(next.getMinutes() + totalMinutes);
    return next;
  }, [startDate, totalMinutes]);

  const emailValue = selectedClient?.email ?? newClientDraft?.email.trim() ?? '';
  const firstNameValue = selectedClient?.first_name ?? newClientDraft?.firstName.trim() ?? '';
  const lastNameValue = selectedClient?.last_name ?? newClientDraft?.lastName.trim() ?? '';
  const hasClientIdentity = Boolean(selectedClient) || firstNameValue.length > 0;
  const canSave = cart.length > 0 && Boolean(staffId) && emailValue.length > 0 && hasClientIdentity && !submitting;

  const selectedStaff = staffList.find((s) => s.id === staffId) ?? null;
  const staffName = selectedStaff
    ? clientDisplayName(selectedStaff.first_name, selectedStaff.last_name, t('calendar.employee'))
    : '';
  const weekdays = t('calendar.weekdaysShort', { returnObjects: true }) as string[];
  const dateLabel = `${weekdays[startDate.getDay()]} ${startDate.getDate()} ${getMonthShortLabel(startDate.getMonth())}${
    startDate.getFullYear() === new Date().getFullYear() ? '' : ` ${startDate.getFullYear()}`
  }`;
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  const openServices = () => {
    if (!staffId) {
      router.push({ pathname: '/appointment-new/staff-picker', params: { next: 'services' } });
      return;
    }
    router.push({
      pathname: '/appointment-new/service-picker',
      params: { staffId, selected: cart.map((item) => item.serviceVariantId).join(',') },
    });
  };

  const openDate = () =>
    router.push({
      pathname: '/date-time-picker',
      params: { mode: 'date', value: startDate.toISOString(), event: APPOINTMENT_DRAFT_EVENTS.setDateTime, field: 'date', title: t('appointment.dateAndTime') },
    });

  const openTime = () =>
    router.push({
      pathname: '/date-time-picker',
      params: { mode: 'time', value: startDate.toISOString(), event: APPOINTMENT_DRAFT_EVENTS.setDateTime, field: 'time', title: formatTimeForInput(startDate) },
    });

  const handleSave = React.useCallback(async () => {
    if (!companyId || !locationId || cart.length === 0 || !emailValue || !hasClientIdentity || !staffId) {
      setErrorMessage(t('appointment.validationMissingFields'));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const created = await createAppointment({
        start: startDate,
        companyId,
        locationId,
        clientId: selectedClient?.id,
        segments: cart.map((item) => ({
          serviceId: item.serviceId,
          serviceVariantId: item.serviceVariantId,
          staffId: item.staffId,
          price: item.price,
          phases: item.phases,
          durationMinutes: item.durationMinutes,
        })),
        firstName: firstNameValue,
        lastName: lastNameValue,
        email: emailValue,
        notes: notes.trim(),
      });
      DeviceEventEmitter.emit('calendarRefreshAppointments', { appointmentId: created.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('duplicate') || message.includes('conflict')) {
        setErrorMessage(t('appointment.errorConflict'));
      } else if (message.includes('available')) {
        setErrorMessage(t('appointment.errorNotAvailable'));
      } else if (message.includes('foreign key') || message.includes('constraint')) {
        setErrorMessage(t('appointment.errorInvalidSelection'));
      } else {
        setErrorMessage(t('appointment.errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    companyId,
    locationId,
    cart,
    emailValue,
    hasClientIdentity,
    staffId,
    firstNameValue,
    lastNameValue,
    notes,
    startDate,
    selectedClient,
    router,
    t,
  ]);

  const webInputStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: theme.text,
    padding: '8px 12px',
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    backgroundColor: theme.surface,
  };

  const renderDatePill = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={(event) => {
            const [y, m, d] = event.target.value.split('-').map(Number);
            if (y && m && d) {
              setStartDate((prev) => {
                const next = new Date(prev);
                next.setFullYear(y, m - 1, d);
                return next;
              });
            }
          }}
          style={webInputStyle}
        />
      );
    }
    return (
      <Pressable
        style={styles.dateTimePill}
        onPress={() =>
          router.push({
            pathname: '/date-time-picker',
            params: { mode: 'date', value: startDate.toISOString(), event: APPOINTMENT_DRAFT_EVENTS.setDateTime, field: 'date', title: t('appointment.dateAndTime') },
          })
        }>
        <AppIcon name="calendar" size={16} color={theme.muted} />
        <Text style={styles.dateTimePillText}>
          {`${startDate.getDate()} ${getMonthShortLabel(startDate.getMonth())} ${startDate.getFullYear()}`}
        </Text>
      </Pressable>
    );
  };

  const renderTimePill = () => {
    if (Platform.OS === 'web') {
      return (
        <input
          type="time"
          value={formatTimeForInput(startDate)}
          onChange={(event) => {
            const [h, m] = event.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m)) {
              setStartDate((prev) => {
                const next = new Date(prev);
                next.setHours(h, m, 0, 0);
                return next;
              });
            }
          }}
          style={webInputStyle}
        />
      );
    }
    return (
      <Pressable
        style={styles.dateTimePill}
        onPress={() =>
          router.push({
            pathname: '/date-time-picker',
            params: { mode: 'time', value: startDate.toISOString(), event: APPOINTMENT_DRAFT_EVENTS.setDateTime, field: 'time', title: formatTimeForInput(startDate) },
          })
        }>
        <AppIcon name="schedule" size={16} color={theme.muted} />
        <Text style={styles.dateTimePillText}>{formatTimeForInput(startDate)}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.title'),
          unstable_headerLeftItems: ({ tintColor }) => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: tintColor ?? theme.text,
              onPress: () => router.back(),
            },
          ],
          headerRight: () => (
            <HeaderButton
              onPress={() => {
                if (!canSave) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  setErrorMessage(t('appointment.validationMissingFields'));
                  return;
                }
                handleSave();
              }}
              disabled={submitting}
              hitSlop={8}
              style={styles.headerTextButton}>
              <Text style={[styles.headerSaveText, { color: canSave ? theme.tint : theme.muted }]}>{t('appointment.save')}</Text>
            </HeaderButton>
          ),
        }}
      />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.slotCard}>
          {Platform.OS === 'web' ? (
            <View style={styles.dateTimeRow}>
              {renderDatePill()}
              {renderTimePill()}
            </View>
          ) : (
            <View style={styles.slotWhen}>
              <Pressable onPress={openDate} hitSlop={8}>
                <Text style={styles.slotDate}>{dateLabel}</Text>
              </Pressable>
              <Pressable onPress={openTime} hitSlop={8}>
                <Text style={styles.slotTime}>{formatTimeForInput(startDate)}</Text>
              </Pressable>
            </View>
          )}
          {staffLoading ? (
            <RowListSkeleton count={1} style={{ paddingHorizontal: 0, paddingTop: 0 }} />
          ) : staffList.length === 0 ? (
            <EmptyState compact icon="groups" title={t('staff.noStaff')} subtitle={t('staff.noStaffHint')} />
          ) : (
            <Pressable
              style={styles.staffRow}
              onPress={() => router.push({ pathname: '/appointment-new/staff-picker', params: staffId ? { staffId } : {} })}>
              <StaffAvatar imagePath={selectedStaff?.image_path} name={staffName || t('appointment.staffMember')} size={36} fontSize={13} />
              <Text style={[styles.clientRowName, styles.flexFill]}>{staffName || t('appointment.selectStaffFirstHint')}</Text>
              <AppIcon name="chevronRight" size={18} color={theme.muted} />
            </Pressable>
          )}
          {totalMinutes > 0 ? (
            <Text style={styles.endsHint}>{`${formatTimeForInput(startDate)}–${formatTimeForInput(endDate)} · ${totalMinutes} ${t('appointment.minutesShort')}`}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('appointment.services')}</Text>
          {cart.map((item, index) => (
            <View key={`${item.serviceId}-${item.serviceVariantId}-${index}`} style={styles.staffRow}>
              <View style={[styles.serviceSwatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(item.color, item.serviceName)] }]} />
              <View style={styles.flexFill}>
                <Text style={styles.clientRowName}>{item.serviceName}</Text>
                <Text style={styles.clientRowMeta}>
                  {`${item.variantName} · ${item.durationMinutes} ${t('appointment.minutesShort')} · €${item.price}`}
                </Text>
              </View>
              <Pressable onPress={() => setCart((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                <AppIcon name="close" size={18} color={theme.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.noteAction} onPress={openServices}>
            <AppIcon name="add" size={16} color={theme.muted} />
            <Text style={styles.noteActionText}>{t('appointment.addService')}</Text>
          </Pressable>
          {cart.length > 0 ? (
            <Text style={styles.endsHint}>{`${totalMinutes} ${t('appointment.minutesShort')} · €${totalPrice}`}</Text>
          ) : null}
        </View>

        {selectedClient || newClientDraft ? (
          <View style={styles.staffRow}>
            <Pressable style={styles.searchMain} onPress={() => router.push('/appointment-new/client-picker')}>
              <StaffAvatar
                imagePath={null}
                name={
                  selectedClient
                    ? clientDisplayName(selectedClient.first_name, selectedClient.last_name, selectedClient.email)
                    : clientDisplayName(newClientDraft?.firstName, newClientDraft?.lastName, newClientDraft?.email ?? '')
                }
                size={36}
                fontSize={13}
              />
              <View style={styles.flexFill}>
                <Text style={styles.clientRowName}>
                  {selectedClient
                    ? clientDisplayName(selectedClient.first_name, selectedClient.last_name, selectedClient.email)
                    : clientDisplayName(newClientDraft?.firstName, newClientDraft?.lastName, newClientDraft?.email ?? '')}
                </Text>
                <Text style={styles.clientRowMeta}>{selectedClient ? selectedClient.email : newClientDraft?.email}</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleClearClient} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.muted} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.staffRow} onPress={() => router.push('/appointment-new/client-picker')}>
            <View style={styles.clientMark}>
              <AppIcon name="person" size={18} color={theme.muted} />
            </View>
            <Text style={[styles.clientRowName, styles.flexFill, styles.placeholderName]}>{t('appointment.chooseClient')}</Text>
            <AppIcon name="chevronRight" size={18} color={theme.muted} />
          </Pressable>
        )}

        {notesOpen || notes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('appointment.notes')}</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              placeholder={t('appointment.notesPlaceholder')}
              placeholderTextColor={theme.muted}
              value={notes}
              onChangeText={(text) => setNotes(text.slice(0, 500))}
              maxLength={500}
              multiline
              autoFocus={notesOpen && notes.length === 0}
            />
            <Text style={styles.notesCounter}>{`${notes.length}/500`}</Text>
          </View>
        ) : (
          <Pressable style={styles.noteAction} onPress={() => setNotesOpen(true)}>
            <AppIcon name="add" size={16} color={theme.muted} />
            <Text style={styles.noteActionText}>{t('appointment.addNoteAction')}</Text>
          </Pressable>
        )}
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
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    headerSaveText: {
      fontSize: 16,
      fontWeight: '700',
    },
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: Design.controlRadius,
      backgroundColor: `${theme.error}22`,
    },
    errorBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.error,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
      gap: 24,
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
    slotCard: {
      gap: 12,
      paddingBottom: 4,
    },
    slotWhen: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    slotDate: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
    },
    slotTime: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      fontVariant: ['tabular-nums'],
    },
    staffRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    clientMark: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    placeholderName: {
      color: theme.muted,
      fontWeight: '600',
    },
    searchMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    noteAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'stretch',
      minHeight: Design.touchTarget,
    },
    noteActionText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.muted,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionHeaderText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
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
    searchInputPlaceholder: {
      fontSize: 15,
      color: theme.muted,
    },
    clientRowName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    clientRowMeta: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    fieldInput: {
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    notesCounter: {
      alignSelf: 'flex-end',
      fontSize: 12,
      color: theme.muted,
    },
    selectedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    cartRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    serviceSwatch: {
      width: 40,
      height: 40,
      borderRadius: Design.controlRadius,
    },
    serviceRowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    addTile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 14,
    },
    addTileDisabled: {
      opacity: 0.4,
    },
    addTileText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    emptyHintText: {
      fontSize: 13,
      color: theme.muted,
    },
    dateTimeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    dateTimePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    dateTimePillText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    endsHint: {
      fontSize: 12,
      color: theme.muted,
    },
  });
}
