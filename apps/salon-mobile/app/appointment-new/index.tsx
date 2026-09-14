import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { StaffAvatar } from '@/components/staff-avatar';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createAppointment } from '@/lib/api/appointment-create';
import { fetchStaff, StaffMember } from '@/lib/api/calendar';
import { ClientSearchResult } from '@/lib/api/clients';
import { fetchServices, ServiceWithVariants } from '@/lib/api/services';
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

function defaultStartDate(dateParam?: string) {
  const base = dateParam ? new Date(dateParam) : new Date();
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
  const params = useLocalSearchParams<{ date?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(true);
  const [staffId, setStaffId] = React.useState<string | null>(null);

  const [servicesList, setServicesList] = React.useState<ServiceWithVariants[]>([]);
  const [cart, setCart] = React.useState<CartItem[]>([]);

  const [selectedClient, setSelectedClient] = React.useState<ClientSearchResult | null>(null);
  const [newClientDraft, setNewClientDraft] = React.useState<NewClientDraft | null>(null);

  const [startDate, setStartDate] = React.useState<Date>(() => defaultStartDate(params.date));

  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    setStaffLoading(true);
    fetchStaff(companyId, locationId)
      .then(setStaffList)
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));

    fetchServices(companyId, locationId)
      .then(setServicesList)
      .catch(() => setServicesList([]));
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
            <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8} style={styles.headerTextButton}>
              {submitting ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.headerSaveText, { color: canSave ? theme.tint : theme.muted }]}>{t('appointment.save')}</Text>
              )}
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
        {/* Client */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppIcon name="person" size={18} color={theme.muted} />
            <Text style={styles.sectionHeaderText}>{t('appointment.client')}</Text>
          </View>
          {selectedClient || newClientDraft ? (
            <View style={styles.selectedCard}>
              <StaffAvatar
                imagePath={null}
                name={
                  selectedClient
                    ? clientDisplayName(selectedClient.first_name, selectedClient.last_name, selectedClient.email)
                    : clientDisplayName(newClientDraft?.firstName, newClientDraft?.lastName, newClientDraft?.email ?? '')
                }
                size={40}
              />
              <View style={styles.flexFill}>
                <Text style={styles.clientRowName}>
                  {selectedClient
                    ? clientDisplayName(selectedClient.first_name, selectedClient.last_name, selectedClient.email)
                    : clientDisplayName(newClientDraft?.firstName, newClientDraft?.lastName, newClientDraft?.email ?? '')}
                </Text>
                <Text style={styles.clientRowMeta}>{selectedClient ? selectedClient.email : newClientDraft?.email}</Text>
              </View>
              <Pressable onPress={handleClearClient} hitSlop={8}>
                <AppIcon name="close" size={18} color={theme.muted} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.searchInputRow} onPress={() => router.push('/appointment-new/client-picker')}>
              <AppIcon name="search" size={18} color={theme.muted} />
              <Text style={styles.searchInputPlaceholder}>{t('appointment.searchClientPlaceholder')}</Text>
              <Pressable hitSlop={8} onPress={() => router.push('/appointment-new/new-client')}>
                <AppIcon name="personAdd" size={20} color={theme.muted} />
              </Pressable>
            </Pressable>
          )}
        </View>

        {/* Staff */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppIcon name="groups" size={18} color={theme.muted} />
            <Text style={styles.sectionHeaderText}>{t('appointment.staffMember')}</Text>
          </View>
          {staffLoading ? (
            <ActivityIndicator color={theme.muted} />
          ) : staffList.length === 0 ? (
            <EmptyState compact icon="groups" title={t('staff.noStaff')} subtitle={t('staff.noStaffHint')} />
          ) : selectedStaff ? (
            <Pressable
              style={styles.selectedCard}
              onPress={() => router.push({ pathname: '/appointment-new/staff-picker', params: { staffId: selectedStaff.id } })}>
              <StaffAvatar imagePath={null} name={clientDisplayName(selectedStaff.first_name, selectedStaff.last_name, t('calendar.employee'))} size={40} />
              <Text style={[styles.clientRowName, styles.flexFill]}>
                {clientDisplayName(selectedStaff.first_name, selectedStaff.last_name, t('calendar.employee'))}
              </Text>
              <AppIcon name="chevronRight" size={18} color={theme.muted} />
            </Pressable>
          ) : (
            <Pressable style={styles.searchInputRow} onPress={() => router.push('/appointment-new/staff-picker')}>
              <AppIcon name="groups" size={18} color={theme.muted} />
              <Text style={[styles.searchInputPlaceholder, styles.flexFill]}>{t('appointment.defaultStaff')}</Text>
              <AppIcon name="chevronRight" size={18} color={theme.muted} />
            </Pressable>
          )}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppIcon name="cut" size={18} color={theme.muted} />
            <Text style={styles.sectionHeaderText}>{t('appointment.services')}</Text>
          </View>
          {cart.map((item, index) => (
            <View key={`${item.serviceId}-${item.serviceVariantId}-${index}`} style={styles.cartRow}>
              <View style={[styles.serviceSwatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(item.color, item.serviceName)] }]} />
              <View style={styles.flexFill}>
                <Text style={styles.serviceRowTitle}>{item.serviceName}</Text>
                <Text style={styles.clientRowMeta}>
                  {`${item.variantName} · ${item.durationMinutes} ${t('appointment.minutesShort')} · €${item.price}`}
                </Text>
              </View>
              <Pressable onPress={() => setCart((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                <AppIcon name="close" size={18} color={theme.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={[styles.addTile, !staffId && styles.addTileDisabled]}
            disabled={!staffId}
            onPress={() => staffId && router.push({ pathname: '/appointment-new/service-picker', params: { staffId } })}>
            <AppIcon name="add" size={16} color={theme.text} />
            <Text style={styles.addTileText}>{t('appointment.addService')}</Text>
          </Pressable>
          {!staffId ? (
            <Text style={styles.emptyHintText}>{t('appointment.selectStaffFirstHint')}</Text>
          ) : cart.length === 0 ? (
            <Text style={styles.emptyHintText}>{t('appointment.noServicesAddedHint')}</Text>
          ) : null}
        </View>

        {/* Date & time */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppIcon name="calendar" size={18} color={theme.muted} />
            <Text style={styles.sectionHeaderText}>{t('appointment.dateAndTime')}</Text>
          </View>
          <View style={styles.dateTimeRow}>
            {renderDatePill()}
            {renderTimePill()}
          </View>
          <Text style={styles.endsHint}>{`${t('appointment.ends')}: ${formatTimeForInput(endDate)}  ·  ${t('appointment.endsComputedHint')}`}</Text>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <AppIcon name="note" size={18} color={theme.muted} />
            <Text style={styles.sectionHeaderText}>{t('appointment.notes')}</Text>
          </View>
          <TextInput
            style={[styles.fieldInput, styles.notesInput]}
            placeholder={t('appointment.notesPlaceholder')}
            placeholderTextColor={theme.muted}
            value={notes}
            onChangeText={(text) => setNotes(text.slice(0, 500))}
            maxLength={500}
            multiline
          />
          <Text style={styles.notesCounter}>{`${notes.length}/500`}</Text>
        </View>
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
