import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { SwipeableRow } from '@/components/swipeable-row';
import { Button, ErrorBanner, FormScreen, SectionHeader, useTheme } from '@/components/ui';
import { RowListSkeleton } from '@/components/content-skeletons';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { fetchOwnStaffProfile } from '@/lib/api/profile';
import {
  ScheduleException,
  deleteTimeOff,
  fetchScheduleRules,
  fetchStaffMember,
  fetchTimeOff,
  parseTimeOfDay,
  replaceDayScheduleRules,
} from '@/lib/api/staff';
import i18n from '@/lib/i18n';
import {
  DISPLAY_DAYS,
  DayDraft,
  DayIssue,
  ScheduleSlot,
  clockFromMinutes,
  dayFromRules,
  dayIssue,
  desiredSlots,
  emptyDay,
  enableDay,
  formatClock,
  hoursTemplate,
  minutesFromClock,
  newSlotKey,
  nextBlock,
  sortSlots,
  upcomingAbsences,
} from '@/lib/schedule-draft';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

const AVAILABILITY_EVENT = 'availabilityDraft:setTime';

type PickerField = { day: number; key: string; edge: 'start' | 'end' };

function encodeField(field: PickerField) {
  return `${field.day}:${field.key}:${field.edge}`;
}

function decodeField(raw: string): PickerField {
  const [day, key, edge] = raw.split(':');
  return { day: Number(day), key, edge: edge as 'start' | 'end' };
}

function dateAt(minutes: number) {
  const { hours, minutes: mins } = clockFromMinutes(minutes);
  const date = new Date();
  date.setHours(hours, mins, 0, 0);
  return date;
}

function titleCase(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWholeDay(start: Date, end: Date) {
  return start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() >= 59;
}

export default function StaffAvailabilityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId, user } = useAuth();
  const { locationId } = useLocation();
  const theme = useTheme();

  const [days, setDays] = React.useState<Record<number, DayDraft>>(() => {
    const initial: Record<number, DayDraft> = {};
    DISPLAY_DAYS.forEach((day) => {
      initial[day] = emptyDay();
    });
    return initial;
  });
  const [absences, setAbsences] = React.useState<ScheduleException[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOwn, setIsOwn] = React.useState(true);
  const [staffName, setStaffName] = React.useState('');

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AVAILABILITY_EVENT, ({ field, value }: { field: string; value: string }) => {
      const target = decodeField(field);
      const next = new Date(value);
      const minutes = minutesFromClock(next.getHours(), next.getMinutes());
      setDays((prev) => {
        const day = prev[target.day];
        if (!day) return prev;
        const slots = sortSlots(day.slots.map((slot) => (slot.key === target.key ? { ...slot, [target.edge]: minutes } : slot)));
        return { ...prev, [target.day]: { ...day, slots } };
      });
    });
    return () => sub.remove();
  }, []);

  const openPicker = (target: PickerField, minutes: number, title: string) => {
    router.push({
      pathname: '/date-time-picker',
      params: {
        mode: 'time',
        value: dateAt(minutes).toISOString(),
        event: AVAILABILITY_EVENT,
        field: encodeField(target),
        title,
      },
    });
  };

  const loadAbsences = React.useCallback(async () => {
    if (!id || !companyId) return;
    const rows = await fetchTimeOff(id, companyId, locationId ?? undefined);
    setAbsences(upcomingAbsences(rows, new Date()));
  }, [id, companyId, locationId]);

  const load = React.useCallback(async () => {
    if (!id || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const [slots, member, own] = await Promise.all([
        fetchScheduleRules(id, companyId, locationId ?? undefined),
        fetchStaffMember(id),
        user ? fetchOwnStaffProfile(user.id, companyId) : Promise.resolve(null),
      ]);
      const byDay = new Map<number, { id: string; start: number; end: number }[]>();
      slots.forEach((slot) => {
        const start = parseTimeOfDay(slot.start_time);
        const end = parseTimeOfDay(slot.end_time);
        const list = byDay.get(slot.day_of_week) ?? [];
        list.push({ id: slot.id, start: minutesFromClock(start.hours, start.minutes), end: minutesFromClock(end.hours, end.minutes) });
        byDay.set(slot.day_of_week, list);
      });
      const next: Record<number, DayDraft> = {};
      DISPLAY_DAYS.forEach((day) => {
        next[day] = dayFromRules(byDay.get(day) ?? []);
      });
      setDays(next);
      setIsOwn(own?.id === id);
      setStaffName(`${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim());
      await loadAbsences();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoadAvailability'));
    } finally {
      setLoading(false);
    }
  }, [id, companyId, locationId, user, t, loadAbsences]);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      if (loading) return;
      loadAbsences().catch(() => setError(t('staff.failedToLoadTimeOff')));
    }, [loading, loadAbsences, t])
  );

  const weekdaysLong = i18n.t('calendar.weekdaysLong', { returnObjects: true }) as string[];
  const monthsShort = i18n.t('calendar.monthsShort', { returnObjects: true }) as string[];
  const issues = DISPLAY_DAYS.map((day) => dayIssue(days[day]));
  const hasIssue = issues.some(Boolean);
  const monday = days[1];
  const canCopyMonday = monday?.working && dayIssue(monday) == null;

  const handleSave = async () => {
    if (!id || !companyId || !locationId) {
      setError(t('calendar.noLocation'));
      return;
    }
    if (hasIssue) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(
        DISPLAY_DAYS.map(async (day) => {
          const slots = desiredSlots(days[day]).map((slot) => {
            const start = clockFromMinutes(slot.start);
            const end = clockFromMinutes(slot.end);
            return {
              id: slot.id,
              startHours: start.hours,
              startMinutes: start.minutes,
              endHours: end.hours,
              endMinutes: end.minutes,
            };
          });
          await replaceDayScheduleRules(id, companyId, locationId, day, days[day].ruleIds, slots);
        })
      );
      router.back();
    } catch {
      setError(t('staff.failedToSaveAvailability'));
    } finally {
      setSaving(false);
    }
  };

  const copyMonday = () => {
    setDays((prev) => {
      const source = prev[1];
      const next = { ...prev };
      [2, 3, 4, 5].forEach((day) => {
        next[day] = {
          working: true,
          ruleIds: prev[day].ruleIds,
          slots: source.slots.map((slot, index) => ({
            key: `${day}-${slot.key}`,
            id: prev[day].ruleIds[index] ?? null,
            start: slot.start,
            end: slot.end,
          })),
        };
      });
      return next;
    });
  };

  const removeAbsence = async (absenceId: string) => {
    const previous = absences;
    setAbsences((current) => current.filter((item) => item.id !== absenceId));
    try {
      await deleteTimeOff(absenceId);
    } catch {
      setAbsences(previous);
      setError(t('staff.failedToDeleteTimeOff'));
    }
  };

  const screenOptions = <Stack.Screen options={{ headerShown: true, title: t('staff.workdays') }} />;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
        {screenOptions}
        <RowListSkeleton count={7} avatar={false} />
      </SafeAreaView>
    );
  }

  const title = isOwn || !staffName ? t('staff.workdaysTitle') : t('staff.workdaysTitleOther', { name: staffName });

  return (
    <>
      {screenOptions}
      <FormScreen
        title={title}
        subtitle={t('staff.workdaysSubtitle')}
        contentStyle={styles.content}
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={hasIssue} />}>
        <ErrorBanner message={error} />
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {DISPLAY_DAYS.map((day, index) => (
            <DayRow
              key={day}
              name={titleCase(weekdaysLong[day] ?? '')}
              state={days[day]}
              issue={issues[index]}
              separated={index > 0}
              onToggle={(working) =>
                setDays((prev) => ({
                  ...prev,
                  [day]: working ? enableDay(prev[day], hoursTemplate(prev, day)) : { ...prev[day], working: false },
                }))
              }
              onPick={(key, edge, minutes, label) => openPicker({ day, key, edge }, minutes, label)}
              onAdd={() =>
                setDays((prev) => {
                  const placed = nextBlock(prev[day].slots);
                  if (!placed) return prev;
                  return {
                    ...prev,
                    [day]: { ...prev[day], slots: sortSlots([...prev[day].slots, { key: newSlotKey(), id: null, ...placed }]) },
                  };
                })
              }
              onRemove={(key) =>
                setDays((prev) => ({
                  ...prev,
                  [day]: { ...prev[day], slots: prev[day].slots.filter((slot) => slot.key !== key) },
                }))
              }
            />
          ))}
        </View>

        {canCopyMonday ? (
          <Pressable accessibilityRole="button" onPress={copyMonday} hitSlop={6} style={styles.copyButton}>
            <Text style={[styles.copyText, { color: theme.tint }]}>{t('staff.copyWeekdays')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.absenceSection}>
          <SectionHeader
            title={t('staff.timeOff')}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('staff.addTimeOff')}
                hitSlop={8}
                onPress={() => router.push({ pathname: '/staff/time-off-new', params: { staffId: id } })}>
                <AppIcon name="add" size={22} color={theme.tint} />
              </Pressable>
            }
          />
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            {absences.length === 0 ? (
              <Text style={[styles.emptyAbsence, { color: theme.muted }]}>{t('staff.noUpcomingTimeOff')}</Text>
            ) : (
              absences.map((absence, index) => {
                const start = new Date(absence.starts_at);
                const end = new Date(absence.ends_at);
                const copy = absenceLabel(start, end, weekdaysLong, monthsShort, t);
                return (
                  <SwipeableRow key={absence.id} onDelete={() => removeAbsence(absence.id)} deleteLabel={t('common.delete')}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/staff/time-off-new', params: { id: absence.id, staffId: id } })}
                      style={[styles.absenceRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
                      <View style={[styles.dateMark, { backgroundColor: theme.blueTint }]}>
                        <Text style={[styles.dateDay, { color: theme.text }]}>{copy.day}</Text>
                        <Text style={[styles.dateMonth, { color: theme.muted }]}>{copy.month}</Text>
                      </View>
                      <View style={styles.absenceText}>
                        <Text style={[styles.absenceTitle, { color: theme.text }]} numberOfLines={1}>{copy.title}</Text>
                        <Text style={[styles.absenceTime, { color: theme.muted }]} numberOfLines={1}>{copy.time}</Text>
                      </View>
                    </Pressable>
                  </SwipeableRow>
                );
              })
            )}
          </View>
        </View>
      </FormScreen>
    </>
  );
}

function absenceLabel(
  start: Date,
  end: Date,
  weekdays: string[],
  months: string[],
  t: (key: string) => string
) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const multi = !sameDay(start, end);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  let title: string;
  if (multi) {
    title = sameMonth
      ? `${start.getDate()}–${end.getDate()} ${months[end.getMonth()] ?? ''}`
      : `${start.getDate()} ${months[start.getMonth()] ?? ''} – ${end.getDate()} ${months[end.getMonth()] ?? ''}`;
  } else if (sameDay(start, today)) {
    title = t('calendar.today');
  } else if (sameDay(start, tomorrow)) {
    title = t('staff.tomorrow');
  } else {
    title = `${titleCase(weekdays[start.getDay()] ?? '')} ${start.getDate()} ${months[start.getMonth()] ?? ''}`;
  }
  const time = isWholeDay(start, end)
    ? t('calendar.unavailability.wholeDay')
    : `${formatClock(minutesFromClock(start.getHours(), start.getMinutes()))} – ${formatClock(minutesFromClock(end.getHours(), end.getMinutes()))}`;
  return { day: String(start.getDate()), month: months[start.getMonth()] ?? '', title, time };
}

function DayRow({
  name,
  state,
  issue,
  separated,
  onToggle,
  onPick,
  onAdd,
  onRemove,
}: {
  name: string;
  state: DayDraft;
  issue: DayIssue;
  separated: boolean;
  onToggle: (working: boolean) => void;
  onPick: (key: string, edge: 'start' | 'end', minutes: number, label: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const slots = sortSlots(state.slots);
  const canAdd = state.working && nextBlock(slots) != null;
  const issueText = issue === 'range' ? t('staff.invalidRange') : issue === 'slot' ? t('staff.invalidSlot') : null;

  return (
    <View style={[styles.day, separated && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
      <View style={styles.dayLine}>
        <Switch
          value={state.working}
          onValueChange={onToggle}
          trackColor={{ false: theme.border, true: theme.tint }}
          accessibilityLabel={name}
        />
        <Text style={[styles.dayName, { color: state.working ? theme.text : theme.muted }]} numberOfLines={1}>
          {name}
        </Text>
        {state.working && slots[0] ? (
          <SlotTimes
            slot={slots[0]}
            onPick={(edge, minutes, label) => onPick(slots[0].key, edge, minutes, label)}
            onRemove={slots.length > 1 ? () => onRemove(slots[0].key) : undefined}
          />
        ) : null}
        {!state.working ? <Text style={[styles.off, { color: theme.muted }]}>{t('staff.off')}</Text> : null}
        {canAdd && slots.length === 1 ? <IconButton name="add" label={t('staff.addBlock')} onPress={onAdd} /> : null}
      </View>

      {state.working
        ? slots.slice(1).map((slot, index) => (
            <View key={slot.key} style={styles.extraLine}>
              <SlotTimes slot={slot} onPick={(edge, minutes, label) => onPick(slot.key, edge, minutes, label)} onRemove={() => onRemove(slot.key)} />
              {canAdd && index === slots.length - 2 ? <IconButton name="add" label={t('staff.addBlock')} onPress={onAdd} /> : null}
            </View>
          ))
        : null}

      {issueText ? <Text style={[styles.issue, { color: theme.error }]}>{issueText}</Text> : null}
    </View>
  );
}

function SlotTimes({
  slot,
  onPick,
  onRemove,
}: {
  slot: ScheduleSlot;
  onPick: (edge: 'start' | 'end', minutes: number, label: string) => void;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.times}>
      <TimePill label={t('appointment.starts')} value={formatClock(slot.start)} onPress={() => onPick('start', slot.start, t('appointment.starts'))} />
      <Text style={[styles.dash, { color: theme.muted }]}>–</Text>
      <TimePill label={t('appointment.ends')} value={formatClock(slot.end)} onPress={() => onPick('end', slot.end, t('appointment.ends'))} />
      {onRemove ? <IconButton name="close" label={t('staff.removeBlock')} onPress={onRemove} /> : null}
    </View>
  );
}

function TimePill({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Text style={[styles.pillText, { color: theme.text }]}>{value}</Text>
      <AppIcon name="expandMore" size={12} color={theme.muted} />
    </Pressable>
  );
}

function IconButton({ name, label, onPress }: { name: 'add' | 'close'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.iconButton}>
      <AppIcon name={name} size={16} color={theme.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingTop: 4, gap: 16 },
  card: { borderRadius: 16, borderCurve: 'continuous', overflow: 'hidden' },
  day: { paddingLeft: 12, paddingRight: 8, paddingVertical: 5 },
  dayLine: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { flex: 1, fontSize: 16, fontWeight: '600' },
  times: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  extraLine: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  dash: { fontSize: 14, fontWeight: '500' },
  off: { fontSize: 15, fontWeight: '500', marginRight: 8 },
  pill: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 8,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  pillText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  iconButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  issue: { fontSize: 12, fontWeight: '500', paddingBottom: 4, paddingLeft: 4 },
  copyButton: { alignSelf: 'flex-start', marginTop: -6 },
  copyText: { fontSize: 14, fontWeight: '600' },
  absenceSection: { gap: 8 },
  emptyAbsence: { fontSize: 14, paddingHorizontal: 14, paddingVertical: 14 },
  absenceRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  dateMark: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dateDay: { fontSize: 16, fontWeight: '700', lineHeight: 18 },
  dateMonth: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  absenceText: { flex: 1, gap: 1 },
  absenceTitle: { fontSize: 15, fontWeight: '600' },
  absenceTime: { fontSize: 13 },
});
