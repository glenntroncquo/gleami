import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RowListSkeleton } from '@/components/content-skeletons';
import { ErrorBanner, FieldRow, FormScreen, ListGroup, ListRow, SelectField, SwitchRow, useTheme } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import i18n from '@/lib/i18n';
import {
  ScheduleRule,
  createScheduleRule,
  deleteScheduleRule,
  fetchScheduleRules,
  parseTimeOfDay,
  updateScheduleRule,
} from '@/lib/api/staff';

// Displayed Monday-first for a natural work-week view; values are the
// day_of_week integers actually stored in the DB (0 = Sunday .. 6 = Saturday).
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0];

type DayState = {
  working: boolean;
  start: Date;
  end: Date;
  existingId: string | null;
  multiple: boolean;
};

function defaultDayState(): DayState {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date();
  end.setHours(17, 0, 0, 0);
  return { working: false, start, end, existingId: null, multiple: false };
}

function timeAt(hours: number, minutes: number): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTimeLabel(date: Date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

const AVAILABILITY_EVENT = 'availabilityDraft:setTime';
type AvailabilityField = { day: number; field: 'start' | 'end' };

function encodeField({ day, field }: AvailabilityField) {
  return `${day}:${field}`;
}

function decodeField(raw: string): AvailabilityField {
  const [day, field] = raw.split(':');
  return { day: Number(day), field: field as 'start' | 'end' };
}

export default function StaffAvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const theme = useTheme();

  const [days, setDays] = React.useState<Record<number, DayState>>(() => {
    const initial: Record<number, DayState> = {};
    DISPLAY_DAYS.forEach((day) => {
      initial[day] = defaultDayState();
    });
    return initial;
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AVAILABILITY_EVENT, ({ field, value }: { field: string; value: string }) => {
      const { day, field: which } = decodeField(field);
      setDays((prev) => ({ ...prev, [day]: { ...prev[day], [which]: new Date(value) } }));
    });
    return () => sub.remove();
  }, []);

  const openPicker = (target: AvailabilityField, value: Date, title: string) => {
    router.push({
      pathname: '/date-time-picker',
      params: { mode: 'time', value: value.toISOString(), event: AVAILABILITY_EVENT, field: encodeField(target), title },
    });
  };

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const slots = await fetchScheduleRules(id, companyId, locationId ?? undefined);
      const byDay = new Map<number, ScheduleRule[]>();
      slots.forEach((slot) => {
        const list = byDay.get(slot.day_of_week) ?? [];
        list.push(slot);
        byDay.set(slot.day_of_week, list);
      });

      const next: Record<number, DayState> = {};
      DISPLAY_DAYS.forEach((day) => {
        const slotsForDay = byDay.get(day) ?? [];
        if (slotsForDay.length === 0) {
          next[day] = defaultDayState();
        } else if (slotsForDay.length === 1) {
          const slot = slotsForDay[0];
          const startTime = parseTimeOfDay(slot.start_time);
          const endTime = parseTimeOfDay(slot.end_time);
          next[day] = {
            working: true,
            start: timeAt(startTime.hours, startTime.minutes),
            end: timeAt(endTime.hours, endTime.minutes),
            existingId: slot.id,
            multiple: false,
          };
        } else {
          next[day] = { ...defaultDayState(), multiple: true };
        }
      });
      setDays(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoadAvailability'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!id || !companyId || !locationId) {
      setError(t('calendar.noLocation'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        DISPLAY_DAYS.map(async (day) => {
          const state = days[day];
          if (state.multiple) return;

          if (state.working && state.existingId) {
            await updateScheduleRule(
              state.existingId,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes()
            );
          } else if (state.working && !state.existingId) {
            await createScheduleRule(
              id,
              companyId,
              day,
              state.start.getHours(),
              state.start.getMinutes(),
              state.end.getHours(),
              state.end.getMinutes(),
              locationId
            );
          } else if (!state.working && state.existingId) {
            await deleteScheduleRule(state.existingId);
          }
        })
      );
      router.back();
    } catch {
      setError(t('staff.failedToSaveAvailability'));
    } finally {
      setSaving(false);
    }
  };

  const weekdaysLong = i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[];

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: t('staff.availability'),
        headerRight: () => (
          <HeaderButton onPress={handleSave} disabled={saving} hitSlop={8} style={styles.headerTextButton}>
            <Text style={[styles.saveText, { color: saving ? theme.muted : theme.tint }]}>{t('client.save')}</Text>
          </HeaderButton>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
        {screenOptions}
        <RowListSkeleton count={7} avatar={false} />
      </SafeAreaView>
    );
  }

  return (
    <>
      {screenOptions}
      <FormScreen contentStyle={styles.content}>
        <ErrorBanner message={error} />
        <ListGroup inset={0}>
          {DISPLAY_DAYS.map((day) => {
            const state = days[day];
            if (state.multiple) {
              return <ListRow key={day} title={weekdaysLong[day]} subtitle={t('staff.multipleSlots')} />;
            }
            return (
              <View key={day}>
                <SwitchRow
                  title={weekdaysLong[day]}
                  subtitle={state.working ? undefined : t('staff.dayOff')}
                  value={state.working}
                  onValueChange={(value) => setDays((prev) => ({ ...prev, [day]: { ...prev[day], working: value } }))}
                />
                {state.working ? (
                  <View style={styles.times}>
                    <FieldRow>
                      <SelectField
                        label={t('appointment.starts')}
                        value={formatTimeLabel(state.start)}
                        onPress={() => openPicker({ day, field: 'start' }, state.start, t('appointment.starts'))}
                      />
                      <SelectField
                        label={t('appointment.ends')}
                        value={formatTimeLabel(state.end)}
                        onPress={() => openPicker({ day, field: 'end' }, state.end, t('appointment.ends'))}
                      />
                    </FieldRow>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ListGroup>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingTop: 16 },
  headerTextButton: { width: 'auto', minWidth: 0, paddingHorizontal: 4 },
  saveText: { fontSize: 16, fontWeight: '600' },
  times: { paddingHorizontal: 14, paddingBottom: 14 },
});
