import { StaffAvatar } from '@/components/staff-avatar';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, DeviceEventEmitter, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ErrorBanner, Field, FieldRow, FormScreen, ListGroup, OptionCard, RadioRow, SelectField, useModalHeader } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { createTimeOff, deleteTimeOff, fetchAllStaff, fetchTimeOffById, updateTimeOff, type Staff } from '@/lib/api/staff';

const TIME_OFF_EVENT = 'timeOffDraft:setDateTime';

type PresetKey = 'custom' | 'lunch' | 'break' | 'wholeDay';
type Preset = { key: PresetKey; icon: 'edit' | 'restaurant' | 'coffee' | 'calendar'; minutes?: number };

const PRESETS: Preset[] = [
  { key: 'custom', icon: 'edit' },
  { key: 'lunch', icon: 'restaurant', minutes: 30 },
  { key: 'break', icon: 'coffee', minutes: 15 },
  { key: 'wholeDay', icon: 'calendar' },
];

function atTime(base: Date, hours: number, minutes: number) {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function startOfDay(dateKey?: string) {
  const date = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Next quarter hour from now, so a new block starts at a sensible slot. */
function nextQuarter() {
  const now = new Date();
  const minutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
  return atTime(now, Math.min(23, Math.floor(minutes / 60)), minutes >= 24 * 60 ? 45 : minutes % 60);
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date.getTime() + minutes * 60_000);
  // Stay on the same day; blocks are single-day.
  return next.getDate() === date.getDate() ? next : atTime(date, 23, 59);
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function minutesOf(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export default function StaffTimeOffNewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ staffId?: string; date?: string; id?: string }>();
  const editId = params.id;
  const { companyId, user } = useAuth();
  const userId = user?.id;
  const { locationId } = useLocation();
  const modalHeader = useModalHeader();

  // Opened from a staff profile the staff member is fixed; from the calendar it's pickable.
  const pickStaff = !params.staffId || !!editId;

  const [date, setDate] = React.useState(() => startOfDay(params.date));
  const [startTime, setStartTime] = React.useState(nextQuarter);
  const [endTime, setEndTime] = React.useState(() => addMinutes(nextQuarter(), 30));
  const [preset, setPreset] = React.useState<PresetKey>('custom');
  const [staffId, setStaffId] = React.useState<string | undefined>(params.staffId);
  const [staffOptions, setStaffOptions] = React.useState<Staff[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!editId) return;
    let active = true;
    fetchTimeOffById(editId)
      .then((entry) => {
        if (!active || !entry) return;
        const start = new Date(entry.starts_at);
        const end = new Date(entry.ends_at);
        setStaffId(entry.staff_id);
        setDate(atTime(start, 0, 0));
        setStartTime(start);
        setEndTime(end.getHours() === 23 && end.getMinutes() === 59 ? atTime(start, 23, 59) : end);
        if (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59) setPreset('wholeDay');
      })
      .catch(() => {
        if (active) setError(t('calendar.unavailability.failedToLoad'));
      });
    return () => {
      active = false;
    };
  }, [editId, t]);

  React.useEffect(() => {
    if (!pickStaff || !companyId) return;
    let active = true;
    fetchAllStaff(companyId)
      .then((list) => {
        if (!active) return;
        setStaffOptions(list);
        setStaffId((current) => current ?? list.find((staff) => staff.user_id === userId)?.id ?? list[0]?.id);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pickStaff, companyId, userId]);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TIME_OFF_EVENT, ({ field, value }: { field: 'date' | 'start' | 'end'; value: string }) => {
      const picked = new Date(value);
      setPreset('custom');
      if (field === 'date') setDate(picked);
      else if (field === 'start') setStartTime(picked);
      else setEndTime(picked);
    });
    return () => sub.remove();
  }, []);

  const applyPreset = (next: Preset) => {
    setPreset(next.key);
    if (next.key === 'wholeDay') {
      setStartTime(atTime(date, 0, 0));
      setEndTime(atTime(date, 23, 59));
    } else if (next.minutes) {
      setEndTime(addMinutes(startTime, next.minutes));
    }
  };

  const openPicker = (field: 'date' | 'start' | 'end', mode: 'date' | 'time', value: Date, title: string) => {
    router.push({
      pathname: '/date-time-picker',
      params: { mode, value: value.toISOString(), event: TIME_OFF_EVENT, field, title },
    });
  };

  const durationMinutes = minutesOf(endTime) - minutesOf(startTime) + (formatTime(endTime) === '23:59' ? 1 : 0);
  const durationLabel = durationMinutes >= 60
    ? `${t('calendar.unavailability.hours', { count: Math.floor(durationMinutes / 60) })}${durationMinutes % 60 ? ` ${t('calendar.unavailability.minutes', { count: durationMinutes % 60 })}` : ''}`
    : t('calendar.unavailability.minutes', { count: durationMinutes });
  const invalidRange = durationMinutes <= 0;

  const dateLabel = date.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' });

  const handleSave = async () => {
    if (invalidRange) {
      setError(t('calendar.unavailability.endBeforeStart'));
      return;
    }
    if (!staffId || !companyId || !locationId) {
      setError(t('calendar.noLocation'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await updateTimeOff(editId, staffId, date, startTime.getHours(), startTime.getMinutes(), endTime.getHours(), endTime.getMinutes());
      } else {
        await createTimeOff(
          staffId,
          companyId,
          date,
          startTime.getHours(),
          startTime.getMinutes(),
          endTime.getHours(),
          endTime.getMinutes(),
          locationId
        );
      }
      router.back();
    } catch {
      setError(t('staff.failedToSaveTimeOff'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editId) return;
    Alert.alert(t('calendar.unavailability.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          setError(null);
          try {
            await deleteTimeOff(editId);
            router.back();
          } catch {
            setError(t('staff.failedToDeleteTimeOff'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const title = editId
    ? t('calendar.unavailability.editTitle')
    : params.staffId ? t('staff.addTimeOff').replace(/^\+\s*/, '') : t('calendar.addUnavailability');

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={title}
        footer={
          <>
            <Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={invalidRange || deleting} />
            {editId ? (
              <Button label={t('calendar.unavailability.delete')} variant="destructive" onPress={handleDelete} loading={deleting} disabled={saving} />
            ) : null}
          </>
        }>
        <Field label={t('calendar.unavailability.type')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow} style={styles.bleed}>
            {PRESETS.map((item) => (
              <OptionCard
                key={item.key}
                icon={item.icon}
                title={t(`calendar.unavailability.${item.key}`)}
                subtitle={item.minutes ? t('calendar.unavailability.minutes', { count: item.minutes }) : item.key === 'wholeDay' ? '00:00 – 23:59' : '—'}
                selected={preset === item.key}
                onPress={() => applyPreset(item)}
              />
            ))}
          </ScrollView>
        </Field>

        <SelectField
          label={t('calendar.unavailability.date')}
          value={dateLabel}
          onPress={() => openPicker('date', 'date', date, t('calendar.unavailability.date'))}
        />

        <FieldRow>
          <SelectField
            label={t('calendar.unavailability.start')}
            value={formatTime(startTime)}
            onPress={() => openPicker('start', 'time', startTime, t('calendar.unavailability.start'))}
          />
          <SelectField
            label={t('calendar.unavailability.end')}
            value={formatTime(endTime)}
            onPress={() => openPicker('end', 'time', endTime, t('calendar.unavailability.end'))}
            error={invalidRange ? t('calendar.unavailability.endBeforeStart') : null}
            helper={t('calendar.unavailability.duration', { value: durationLabel })}
          />
        </FieldRow>

        {pickStaff ? (
          <Field label={t('calendar.unavailability.teamMember')}>
            <ListGroup inset={58}>
              {staffOptions.map((staff) => {
                const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim();
                return (
                  <RadioRow
                    key={staff.id}
                    title={name}
                    leading={<StaffAvatar imagePath={staff.image_path} name={name} size={32} fontSize={12} />}
                    selected={staff.id === staffId}
                    onPress={() => setStaffId(staff.id)}
                  />
                );
              })}
            </ListGroup>
          </Field>
        ) : null}

        <ErrorBanner message={invalidRange ? null : error} />
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -20 },
  presetRow: { gap: 10, paddingHorizontal: 20 },
});
