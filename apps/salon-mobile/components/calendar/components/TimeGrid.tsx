import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { fetchCalendarAvailability } from '@/lib/api/calendar-availability';
import { absenceBlocks, availableIntervals, unavailableIntervals, type AbsenceBlock, type AvailabilityData } from '../availability';
import React from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TimeGridSkeleton } from '@/components/content-skeletons';
import { StaffAvatar } from '@/components/staff-avatar';
import type { StaffMember } from '@/lib/api/calendar';
import type { EventItem, WeekDayData } from '../types';
import { layoutTimelineEvents } from '../timeline-layout';
import { getWeekdayShort, toDateKey } from '../date-utils';

const HOUR_HEIGHT = 68;
const PPM = HOUR_HEIGHT / 60;
const GUTTER = 52;
const DAY_HEADER = 92;
const NOW = '#FF2D55';

const timeLabel = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

type Column = {
  key: string;
  title: string;
  date: string;
  staffId?: string;
  member?: StaffMember;
  events: EventItem[];
};

type Props = {
  mode: 'dayGrid' | 'weekGrid';
  days: WeekDayData[];
  staff: StaffMember[];
  staffFilterId: string | null;
  selectedStaffIds?: string[];
  width: number;
  loading: boolean;
  onNavigate: (direction: number) => void;
  onToday: () => void;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
};

function Hatch({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {Array.from({ length: 28 }, (_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: index * 11 - 80,
            top: -30,
            width: StyleSheet.hairlineWidth * 2,
            height: '160%',
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
      ))}
    </View>
  );
}

function RingAvatar({
  member,
  name,
  size,
  scheme,
}: {
  member?: StaffMember;
  name: string;
  size: number;
  scheme: 'light' | 'dark';
}) {
  const ring = scheme === 'dark' ? Colors.dark.brandBlue : '#1493B0';
  const fill = scheme === 'dark' ? Colors.dark.blueTint : '#E5F6FA';
  const ink = scheme === 'dark' ? Colors.dark.brandBlue : '#0E7490';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <StaffAvatar
        imagePath={member?.image_path}
        name={name}
        size={size - 5}
        fontSize={Math.round(size * 0.32)}
        backgroundColor={fill}
        textColor={ink}
      />
    </View>
  );
}

function AbsenceItem({ block, firstMinute, left, width, label, scheme, compact, onPress }: {
  block: AbsenceBlock;
  firstMinute: number;
  left: number;
  width: number;
  label: string;
  scheme: 'light' | 'dark';
  compact?: boolean;
  onPress: (block: AbsenceBlock) => void;
}) {
  const bg = scheme === 'dark' ? Colors.dark.surfaceRaised : '#DDE1E8';
  const ink = scheme === 'dark' ? Colors.dark.text : '#3B4252';
  const time = `${timeLabel(block.start)} - ${timeLabel(Math.min(block.end, 24 * 60 - 1))}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${time}`}
      onPress={() => onPress(block)}
      style={{
        position: 'absolute',
        top: (block.start - firstMinute) * PPM + 1,
        height: Math.max(compact ? 30 : 22, (block.end - block.start) * PPM - 3),
        left,
        width,
        backgroundColor: bg,
        borderRadius: compact ? 5 : 8,
        paddingHorizontal: compact ? 4 : 6,
        paddingVertical: compact ? 3 : 4,
        overflow: 'hidden',
      }}>
      <Text numberOfLines={1} style={{ color: ink, fontSize: compact ? 9 : 11, fontVariant: ['tabular-nums'] }}>{time}</Text>
      <Text numberOfLines={1} style={{ color: ink, fontSize: compact ? 10 : 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function TimeGrid({ mode, days, staff, staffFilterId, selectedStaffIds = staffFilterId ? [staffFilterId] : [], width, loading, onNavigate, onEvent, onSlot }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const showAvailability = mode === 'dayGrid' || selectedStaffIds.length > 0;
  const startDate = days[0].dateKey;
  const endDate = days[days.length - 1].dateKey;
  const [retry, setRetry] = React.useState(0);
  const availabilityKey = `${companyId}:${locationId}:${startDate}:${endDate}:${retry}`;
  const [availability, setAvailability] = React.useState<{ key: string; data: AvailabilityData | null } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!companyId || !locationId) return;
      let active = true;
      fetchCalendarAvailability(companyId, locationId, startDate, endDate)
        .then((data) => {
          if (active) setAvailability({ key: availabilityKey, data });
        })
        .catch(() => {
          if (active) setAvailability({ key: availabilityKey, data: null });
        });
      return () => {
        active = false;
      };
    }, [companyId, locationId, startDate, endDate, availabilityKey])
  );

  const schedule = availability?.key === availabilityKey ? availability.data : undefined;
  const usesSchedule = Boolean(schedule && schedule.rules.length > 0);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const day = days[0];
  const visibleStaff = staff.filter((member) => selectedStaffIds.length === 0 || selectedStaffIds.includes(member.id));
  const dayColumns: Column[] =
    mode === 'dayGrid'
      ? [
          ...visibleStaff.map((member) => ({
            key: member.id,
            title: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || member.first_name || '',
            date: day.dateKey,
            staffId: member.id,
            member,
            events: day.appointments.filter((event) => event.staffIds.includes(member.id) || event.staffId === member.id),
          })),
          ...(selectedStaffIds.length === 0 &&
          (staff.length === 0 || day.appointments.some((event) => !event.staffId && event.staffIds.length === 0))
            ? [
                {
                  key: 'unassigned',
                  title: t('calendar.unassignedStaff'),
                  date: day.dateKey,
                  staffId: undefined,
                  member: undefined,
                  events: day.appointments.filter((event) => !event.staffId && event.staffIds.length === 0),
                },
              ]
            : []),
        ]
      : [];

  const absenceLabel = t('calendar.addUnavailability');
  const openAbsence = React.useCallback(
    (block: AbsenceBlock) => router.push({ pathname: '/staff/time-off-new', params: { id: block.id } }),
    [router]
  );
  const hatch = scheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(7,29,67,0.14)';
  const waiting = loading;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {showAvailability && schedule === null ? (
        <Pressable onPress={() => setRetry((value) => value + 1)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <Text style={{ color: theme.error, fontSize: 12 }}>
            {t('staff.failedToLoadSchedule')} · {t('calendar.retry')}
          </Text>
        </Pressable>
      ) : null}
      {waiting ? (
        <TimeGridSkeleton />
      ) : mode === 'weekGrid' ? (
        <WeekBoard
          days={days}
          staff={visibleStaff}
          width={width}
          theme={theme}
          scheme={scheme}
          hatch={hatch}
          usesSchedule={usesSchedule}
          schedule={schedule ?? null}
          todayKey={toDateKey(now)}
          selectedStaffIds={selectedStaffIds}
          includeUnassigned={selectedStaffIds.length === 0 && days.some((item) => item.appointments.some((event) => !event.staffId && event.staffIds.length === 0))}
          unassignedLabel={t('calendar.unassignedStaff')}
          onEvent={onEvent}
          onSlot={onSlot}
          absenceLabel={absenceLabel}
          onAbsence={openAbsence}
        />
      ) : (
        <DayBoard
          columns={dayColumns}
          width={width}
          theme={theme}
          scheme={scheme}
          hatch={hatch}
          usesSchedule={usesSchedule}
          schedule={schedule ?? null}
          staffIds={visibleStaff.map((member) => member.id)}
          staffFilterIds={selectedStaffIds}
          now={now}
          onNavigate={onNavigate}
          onEvent={onEvent}
          onSlot={onSlot}
          newAppointmentLabel={t('appointment.title')}
          absenceLabel={absenceLabel}
          onAbsence={openAbsence}
        />
      )}
    </View>
  );
}

function DayBoard({
  columns,
  width,
  theme,
  scheme,
  hatch,
  usesSchedule,
  schedule,
  staffIds,
  staffFilterIds,
  now,
  onNavigate,
  onEvent,
  onSlot,
  newAppointmentLabel,
  absenceLabel,
  onAbsence,
}: {
  columns: Column[];
  width: number;
  theme: typeof Colors.light;
  scheme: 'light' | 'dark';
  hatch: string;
  usesSchedule: boolean;
  schedule: AvailabilityData | null;
  staffIds: string[];
  staffFilterIds: string[];
  now: Date;
  onNavigate: (direction: number) => void;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
  newAppointmentLabel: string;
  absenceLabel: string;
  onAbsence: (block: AbsenceBlock) => void;
}) {
  const vertical = React.useRef<ScrollView>(null);
  const headerScroll = React.useRef<ScrollView>(null);
  const track = Math.max(0, width - GUTTER);
  const columnWidth = columns.length > 3 ? Math.max(118, track / columns.length) : track / Math.max(1, columns.length);
  const layouts = columns.map((column) => layoutTimelineEvents(column.events, column.date));
  const firstMinute = Math.floor(Math.min(8 * 60, ...layouts.flat().map((item) => item.start), 8 * 60) / 60) * 60;
  const lastMinute = Math.ceil(Math.max(21 * 60, ...layouts.flat().map((item) => item.end)) / 60) * 60;
  const height = (lastMinute - firstMinute) * PPM;
  const hours = Array.from({ length: (lastMinute - firstMinute) / 60 }, (_, index) => firstMinute + index * 60);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = toDateKey(now);
  const showNow = columns.some((column) => column.date === todayKey) && nowMinutes >= firstMinute && nowMinutes < lastMinute;
  const daySwipe = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.3,
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 48 || Math.abs(gesture.vx) > 0.45) onNavigate(gesture.dx < 0 ? 1 : -1);
    },
  }), [onNavigate]);

  React.useEffect(() => {
    const target = showNow ? nowMinutes : 9 * 60;
    vertical.current?.scrollTo({ y: Math.max(0, (target - firstMinute) * PPM - 120), animated: false });
  }, [firstMinute, nowMinutes, showNow, columns[0]?.date]);

  return (
    <View style={{ flex: 1 }}>
      <View {...daySwipe.panHandlers} style={{ flexDirection: 'row', height: DAY_HEADER, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator }}>
        <View style={{ width: GUTTER }} />
        <ScrollView ref={headerScroll} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
          {columns.map((column) => (
            <View key={column.key} style={{ width: columnWidth, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 }}>
              <RingAvatar member={column.member} name={column.title} size={44} scheme={scheme} />
              <Text numberOfLines={1} style={{ color: theme.text, fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
                {column.member?.first_name || column.title}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <ScrollView ref={vertical} style={{ flex: 1 }} nestedScrollEnabled>
        <View style={{ height: height + 36, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: GUTTER }}>
              {hours.map((minute) => (
                <View key={minute} style={{ height: HOUR_HEIGHT }}>
                  <Text style={{ color: theme.muted, fontSize: 11, fontVariant: ['tabular-nums'], marginTop: -7, textAlign: 'center' }}>
                    {timeLabel(minute)}
                  </Text>
                </View>
              ))}
            </View>
            <ScrollView
              horizontal
              nestedScrollEnabled
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => headerScroll.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false })}
              style={{ width: Math.max(0, width - GUTTER) }}>
              <View style={{ flexDirection: 'row', height }}>
                {columns.map((column, index) => {
                  const gaps =
                    usesSchedule && schedule
                      ? unavailableIntervals(schedule, column.staffId ? [column.staffId] : staffIds, column.date, firstMinute, lastMinute, { keepAbsences: true })
                      : [];
                  const absences = schedule && column.staffId ? absenceBlocks(schedule, column.staffId, column.date) : [];
                  return (
                    <View key={column.key} style={{ width: columnWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.separator }}>
                      {hours.map((minute) => (
                        <View key={minute} style={{ height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.separator }}>
                          {[0, 15, 30, 45].map((offset) => (
                            <Pressable
                              key={offset}
                              accessibilityLabel={`${column.title}, ${timeLabel(minute + offset)}, ${newAppointmentLabel}`}
                              onPress={() => onSlot(column.date, timeLabel(minute + offset), column.staffId)}
                              style={{ flex: 1 }}
                            />
                          ))}
                        </View>
                      ))}
                      {gaps.map((gap, gapIndex) => (
                        <View
                          key={`gap-${gapIndex}`}
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: (gap.start - firstMinute) * PPM,
                            height: (gap.end - gap.start) * PPM,
                            backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(7,29,67,0.035)',
                          }}
                        />
                      ))}
                      {absences.map((block) => (
                        <AbsenceItem
                          key={block.id}
                          block={block}
                          firstMinute={firstMinute}
                          left={3}
                          width={columnWidth - 6}
                          label={absenceLabel}
                          scheme={scheme}
                          onPress={onAbsence}
                        />
                      ))}
                      {layouts[index].map(({ event, start, end, lane, lanes }) => (
                        <Pressable
                          key={event.id}
                          accessibilityLabel={`${event.startTime}–${event.endTime}, ${event.clientName}, ${event.label}`}
                          onPress={() => onEvent(event)}
                          style={{
                            position: 'absolute',
                            top: (start - firstMinute) * PPM + 1,
                            height: Math.max(22, (end - start) * PPM - 3),
                            left: (lane * columnWidth) / lanes + 3,
                            width: columnWidth / lanes - 6,
                            backgroundColor: event.bgColor,
                            borderRadius: 8,
                            paddingHorizontal: 6,
                            paddingVertical: 4,
                            overflow: 'hidden',
                          }}>
                          <Text numberOfLines={1} style={{ color: event.textColor, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                            {event.startTime}
                          </Text>
                          <Text numberOfLines={2} style={{ color: event.textColor, fontSize: 13, fontWeight: '700' }}>
                            {event.clientName}
                          </Text>
                          <Text numberOfLines={1} style={{ color: event.textColor, fontSize: 11 }}>
                            {event.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  );
                })}
                {showNow ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: (nowMinutes - firstMinute) * PPM,
                      height: 2,
                      backgroundColor: NOW,
                    }}
                  />
                ) : null}
              </View>
            </ScrollView>
          </View>
          {showNow ? (
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                width: GUTTER,
                top: (nowMinutes - firstMinute) * PPM + 6,
                textAlign: 'center',
                color: NOW,
                fontSize: 11,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
                backgroundColor: theme.background,
              }}>
              {timeLabel(nowMinutes)}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function WeekBoard({
  days,
  staff,
  width,
  theme,
  scheme,
  hatch,
  usesSchedule,
  schedule,
  todayKey,
  selectedStaffIds,
  includeUnassigned,
  unassignedLabel,
  onEvent,
  onSlot,
  absenceLabel,
  onAbsence,
}: {
  days: WeekDayData[];
  staff: StaffMember[];
  width: number;
  theme: typeof Colors.light;
  scheme: 'light' | 'dark';
  hatch: string;
  usesSchedule: boolean;
  schedule: AvailabilityData | null;
  todayKey: string;
  selectedStaffIds: string[];
  includeUnassigned: boolean;
  unassignedLabel: string;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
  absenceLabel: string;
  onAbsence: (block: AbsenceBlock) => void;
}) {
  const vertical = React.useRef<ScrollView>(null);
  const horizontalHeader = React.useRef<ScrollView>(null);
  const singleStaffSelected = selectedStaffIds.length === 1;
  const headerHeight = 66;
  const labelWidth = GUTTER;
  const columnWidth = Math.max(112, (width - labelWidth) / Math.max(1, days.length));
  const layouts = days.map((day) => layoutTimelineEvents(day.appointments.filter((event) => !event.canceled), day.dateKey));
  // 06:00–22:00 by default, stretched to whole hours if an appointment falls outside it.
  const firstMinute = Math.max(0, Math.floor(Math.min(6 * 60, ...layouts.flat().map((event) => event.start)) / 60) * 60);
  const lastMinute = Math.min(24 * 60, Math.ceil(Math.max(22 * 60, ...layouts.flat().map((event) => event.end)) / 60) * 60);
  const height = (lastMinute - firstMinute) * PPM;
  const hours = Array.from({ length: Math.ceil((lastMinute - firstMinute) / 60) }, (_, index) => firstMinute + index * 60);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = days.some((day) => day.dateKey === todayKey) && nowMinutes >= firstMinute && nowMinutes < lastMinute;
  const weekKey = days[0]?.dateKey;

  React.useEffect(() => {
    const target = showNow ? nowMinutes : 9 * 60;
    vertical.current?.scrollTo({ y: Math.max(0, (target - firstMinute) * PPM - 120), animated: false });
    // Only re-centre when the visible week changes, not on every minute tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, firstMinute]);
  const rows: { key: string; name: string; member?: StaffMember; staffId?: string }[] = [
    ...staff.map((member) => ({
      key: member.id,
      name: `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim(),
      member,
      staffId: member.id,
    })),
    ...(includeUnassigned ? [{ key: 'unassigned', name: unassignedLabel }] : []),
  ];

  const eventsFor = (staffId: string | undefined, day: WeekDayData) =>
    day.appointments.filter((event) => {
      if (event.canceled) return false;
      if (!staffId) return !event.staffId && event.staffIds.length === 0;
      return event.staffIds.includes(staffId) || event.staffId === staffId;
    });

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', height: headerHeight, backgroundColor: theme.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator }}>
        <View style={{ width: GUTTER }} />
        <ScrollView ref={horizontalHeader} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {days.map((day) => {
              const date = new Date(day.dateKey + 'T00:00:00');
              const today = day.dateKey === todayKey;
              return (
                <Pressable key={day.dateKey} onPress={() => onSlot(day.dateKey, '09:00')} style={{ width: columnWidth, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, gap: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.separator }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: today ? theme.tint : 'transparent' }}>
                      <Text style={{ color: today ? theme.onTint : theme.text, fontSize: 14, fontWeight: '600' }}>{day.date}</Text>
                    </View>
                    <Text style={{ color: today ? theme.tint : theme.muted, fontSize: 10 }}>{getWeekdayShort(date)}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <ScrollView ref={vertical} style={{ flex: 1 }} nestedScrollEnabled>
        <View style={{ height: height + 36, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: GUTTER }}>{hours.map((minute) => <View key={minute} style={{ height: HOUR_HEIGHT }}><Text style={{ color: theme.muted, fontSize: 11, marginTop: -7, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{timeLabel(minute)}</Text></View>)}</View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} onScroll={(event) => horizontalHeader.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false })} scrollEventThrottle={16}>
              <View style={{ flexDirection: 'row', height }}>
                {days.map((day, dayIndex) => {
                  const dayRows = singleStaffSelected ? [{ staffId: selectedStaffIds[0], events: day.appointments.filter((event) => event.staffIds.includes(selectedStaffIds[0]) || event.staffId === selectedStaffIds[0]) }] : rows.filter((row) => selectedStaffIds.length === 0 ? true : Boolean(row.staffId && selectedStaffIds.includes(row.staffId))).map((row) => ({ staffId: row.staffId, events: eventsFor(row.staffId, day) }));
                  const flatEvents = dayRows.flatMap((row) => row.events);
                  const dayLayouts = layoutTimelineEvents(flatEvents, day.dateKey);
                  const isOff = usesSchedule && schedule && unavailableIntervals(schedule, dayRows.map((row) => row.staffId).filter((id): id is string => Boolean(id)), day.dateKey, firstMinute, lastMinute, { keepAbsences: singleStaffSelected });
                  // Only a single-staff week has one person per column, so only then can an absence be drawn as a block.
                  const absences = singleStaffSelected && schedule ? absenceBlocks(schedule, selectedStaffIds[0], day.dateKey) : [];
                  return <View key={day.dateKey} style={{ width: columnWidth, height, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.separator }}>
                    {hours.map((minute) => <View key={minute} style={{ height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.separator }}><Pressable style={{ flex: 1 }} onPress={() => onSlot(day.dateKey, timeLabel(minute), singleStaffSelected ? selectedStaffIds[0] : undefined)} /></View>)}
                    {isOff && isOff.length > 0 ? isOff.map((gap, index) => <View key={`gap-${index}`} pointerEvents="none" style={{ position: 'absolute', top: (gap.start - firstMinute) * PPM, height: (gap.end - gap.start) * PPM, left: 0, right: 0, backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(7,29,67,0.035)' }} />) : null}
                    {absences.map((block) => <AbsenceItem key={block.id} block={block} firstMinute={firstMinute} left={2} width={Math.max(0, columnWidth - 4)} label={absenceLabel} scheme={scheme} compact onPress={onAbsence} />)}
                    {dayLayouts.map(({ event, start, end, lane, lanes }) => <Pressable key={event.id} onPress={() => onEvent(event)} style={{ position: 'absolute', top: (start - firstMinute) * PPM + 1, height: Math.max(36, (end - start) * PPM - 3), left: (lane * columnWidth) / lanes + 2, width: Math.max(0, columnWidth / lanes - 4), backgroundColor: event.bgColor, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 3, overflow: 'hidden' }}>
                      <Text numberOfLines={1} style={{ color: event.textColor, fontSize: singleStaffSelected ? 10 : 9, fontVariant: ['tabular-nums'] }}>{event.startTime}</Text>
                      <Text numberOfLines={2} style={{ color: event.textColor, fontSize: singleStaffSelected ? 12 : 10, fontWeight: '700' }}>{event.label}</Text>
                      <Text numberOfLines={1} style={{ color: event.textColor, opacity: 0.85, fontSize: 9 }}>{event.staffName}</Text>
                    </Pressable>)}
                    {showNow && day.dateKey === todayKey ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (nowMinutes - firstMinute) * PPM, height: 2, backgroundColor: NOW }} /> : null}
                  </View>;
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
