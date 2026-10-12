import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { StaffAvatar } from '@/components/staff-avatar';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import {
  Button,
  ErrorBanner,
  Field,
  FieldRow,
  FormScreen,
  ListGroup,
  ListRow,
  SelectField,
  TextField,
  useModalHeader,
  useTheme,
} from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
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
  const theme = useTheme();
  const modalHeader = useModalHeader();

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
    return null;
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
    return null;
  };

  const handleSavePress = () => {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMessage(t('appointment.validationMissingFields'));
      return;
    }
    handleSave();
  };

  const clientName = selectedClient
    ? clientDisplayName(selectedClient.first_name, selectedClient.last_name, selectedClient.email)
    : clientDisplayName(newClientDraft?.firstName, newClientDraft?.lastName, newClientDraft?.email ?? '');

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('appointment.title')}
        footer={<Button label={t('appointment.save')} onPress={handleSavePress} loading={submitting} />}>
        <ErrorBanner message={errorMessage} />

        <Field
          label={t('appointment.dateAndTime')}
          helper={
            totalMinutes > 0
              ? `${formatTimeForInput(startDate)}–${formatTimeForInput(endDate)} · ${totalMinutes} ${t('appointment.minutesShort')}`
              : undefined
          }>
          {Platform.OS === 'web' ? (
            <View style={styles.webRow}>
              {renderDatePill()}
              {renderTimePill()}
            </View>
          ) : (
            <FieldRow>
              <SelectField
                value={dateLabel}
                onPress={openDate}
                leading={<AppIcon name="calendar" size={18} color={theme.muted} />}
              />
              <SelectField
                value={formatTimeForInput(startDate)}
                onPress={openTime}
                leading={<AppIcon name="schedule" size={18} color={theme.muted} />}
              />
            </FieldRow>
          )}
        </Field>

        <Field label={t('appointment.staffMember')}>
          {staffLoading ? (
            <RowListSkeleton count={1} style={styles.skeleton} />
          ) : staffList.length === 0 ? (
            <EmptyState compact icon="groups" title={t('staff.noStaff')} subtitle={t('staff.noStaffHint')} />
          ) : (
            <SelectField
              value={staffName}
              placeholder={t('appointment.selectStaffFirstHint')}
              icon="chevronRight"
              leading={<StaffAvatar imagePath={selectedStaff?.image_path} name={staffName || t('appointment.staffMember')} size={28} fontSize={11} />}
              onPress={() => router.push({ pathname: '/appointment-new/staff-picker', params: staffId ? { staffId } : {} })}
            />
          )}
        </Field>

        <Field
          label={t('appointment.services')}
          helper={cart.length > 0 ? `${totalMinutes} ${t('appointment.minutesShort')} · €${totalPrice}` : undefined}>
          <ListGroup>
            {cart.map((item, index) => (
              <ListRow
                key={`${item.serviceId}-${item.serviceVariantId}-${index}`}
                title={item.serviceName}
                subtitle={`${item.variantName} · ${item.durationMinutes} ${t('appointment.minutesShort')} · €${item.price}`}
                leading={<View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(item.color, item.serviceName)] }]} />}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    onPress={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                    hitSlop={8}>
                    <AppIcon name="close" size={18} color={theme.muted} />
                  </Pressable>
                }
              />
            ))}
            <ListRow title={t('appointment.addService')} icon="add" chevron={false} onPress={openServices} />
          </ListGroup>
        </Field>

        <Field label={t('appointment.client')}>
          {selectedClient || newClientDraft ? (
            <ListGroup>
              <ListRow
                title={clientName}
                subtitle={selectedClient ? selectedClient.email : newClientDraft?.email}
                leading={<StaffAvatar imagePath={null} name={clientName} size={40} fontSize={14} />}
                chevron={false}
                onPress={() => router.push('/appointment-new/client-picker')}
                trailing={
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={handleClearClient} hitSlop={8}>
                    <AppIcon name="close" size={18} color={theme.muted} />
                  </Pressable>
                }
              />
            </ListGroup>
          ) : (
            <SelectField
              placeholder={t('appointment.chooseClient')}
              icon="chevronRight"
              leading={<AppIcon name="person" size={18} color={theme.muted} />}
              onPress={() => router.push('/appointment-new/client-picker')}
            />
          )}
        </Field>

        {notesOpen || notes.length > 0 ? (
          <TextField
            label={t('appointment.notes')}
            placeholder={t('appointment.notesPlaceholder')}
            value={notes}
            onChangeText={(text) => setNotes(text.slice(0, 500))}
            maxLength={500}
            multiline
            autoFocus={notesOpen && notes.length === 0}
            helper={`${notes.length}/500`}
          />
        ) : (
          <Button label={t('appointment.addNoteAction')} icon="add" variant="secondary" size="medium" onPress={() => setNotesOpen(true)} />
        )}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  webRow: { flexDirection: 'row', gap: 8 },
  skeleton: { paddingHorizontal: 0, paddingTop: 0 },
  swatch: { width: 40, height: 40, borderRadius: 12 },
});
