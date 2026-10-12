import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { fetchCalendarAvailability } from '@/lib/api/calendar-availability';
import { availableIntervals, unavailableIntervals, type AvailabilityData } from '../availability';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const ring = scheme === 'dark' ? '#3DDCFF' : '#1493B0';
  const fill = scheme === 'dark' ? '#102E36' : '#E5F6FA';
  const ink = scheme === 'dark' ? '#8AEAFF' : '#0E7490';
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

export function TimeGrid({ mode, days, staff, staffFilterId, width, loading, onEvent, onSlot }: Props) {
  const { t } = useTranslation();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  const showAvailability = mode !== 'weekGrid' || staffFilterId !== null;
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
  const visibleStaff = staff.filter((member) => !staffFilterId || member.id === staffFilterId);
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
          ...(!staffFilterId &&
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
          staff={visibleStaff.length > 0 ? visibleStaff : staff}
          width={width}
          theme={theme}
          scheme={scheme}
          hatch={hatch}
          usesSchedule={usesSchedule}
          schedule={schedule ?? null}
          todayKey={toDateKey(now)}
          includeUnassigned={!staffFilterId && days.some((item) => item.appointments.some((event) => !event.staffId && event.staffIds.length === 0))}
          unassignedLabel={t('calendar.unassignedStaff')}
          onEvent={onEvent}
          onSlot={onSlot}
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
          now={now}
          onEvent={onEvent}
          onSlot={onSlot}
          newAppointmentLabel={t('appointment.title')}
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
  now,
  onEvent,
  onSlot,
  newAppointmentLabel,
}: {
  columns: Column[];
  width: number;
  theme: typeof Colors.light;
  scheme: 'light' | 'dark';
  hatch: string;
  usesSchedule: boolean;
  schedule: AvailabilityData | null;
  staffIds: string[];
  now: Date;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
  newAppointmentLabel: string;
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

  React.useEffect(() => {
    const target = showNow ? nowMinutes : 9 * 60;
    vertical.current?.scrollTo({ y: Math.max(0, (target - firstMinute) * PPM - 120), animated: false });
  }, [firstMinute, nowMinutes, showNow, columns[0]?.date]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', height: DAY_HEADER, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
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
                      ? unavailableIntervals(schedule, column.staffId ? [column.staffId] : staffIds, column.date, firstMinute, lastMinute)
                      : [];
                  return (
                    <View key={column.key} style={{ width: columnWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                      {hours.map((minute) => (
                        <View key={minute} style={{ height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
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
                            overflow: 'hidden',
                          }}>
                          <Hatch color={hatch} />
                        </View>
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
  includeUnassigned,
  unassignedLabel,
  onEvent,
  onSlot,
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
  includeUnassigned: boolean;
  unassignedLabel: string;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
}) {
  const labelWidth = 78;
  const columnWidth = Math.max(44, (width - labelWidth) / Math.max(1, days.length));
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
        <View style={{ width: labelWidth }} />
        {days.map((day) => {
          const date = new Date(day.dateKey + 'T00:00:00');
          const today = day.dateKey === todayKey;
          return (
            <View key={day.dateKey} style={{ width: columnWidth, alignItems: 'center', paddingVertical: 8, gap: 2 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: today ? theme.tint : 'transparent',
                }}>
                <Text style={{ color: today ? theme.onTint : theme.text, fontSize: 15, fontWeight: '600' }}>{day.date}</Text>
              </View>
              <Text style={{ color: today ? theme.tint : theme.muted, fontSize: 11 }}>{getWeekdayShort(date)}</Text>
            </View>
          );
        })}
      </View>
      {rows.map((row) => {
        const counts = days.map((day) => eventsFor(row.staffId, day).length);
        const rowHeight = Math.max(108, 20 + Math.max(0, ...counts) * 30);
        return (
          <View key={row.key} style={{ flexDirection: 'row', minHeight: rowHeight, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
            <View style={{ width: labelWidth, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4 }}>
              <RingAvatar member={row.member} name={row.name} size={36} scheme={scheme} />
              <Text numberOfLines={2} style={{ color: theme.text, fontSize: 11, textAlign: 'center' }}>
                {row.member?.first_name || row.name}
              </Text>
            </View>
            {days.map((day) => {
              const events = eventsFor(row.staffId, day);
              const off =
                usesSchedule && schedule && row.staffId
                  ? availableIntervals(schedule, row.staffId, day.dateKey).length === 0
                  : false;
              return (
                <Pressable
                  key={day.dateKey}
                  accessibilityLabel={`${row.name}, ${day.date}`}
                  onPress={() => onSlot(day.dateKey, '09:00', row.staffId)}
                  style={{ width: columnWidth, minHeight: rowHeight, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.border, padding: 3, gap: 4, overflow: 'hidden' }}>
                  {off ? <Hatch color={hatch} /> : null}
                  {events.slice(0, 4).map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => onEvent(event)}
                      style={{ backgroundColor: event.bgColor, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 3 }}>
                      <Text numberOfLines={1} style={{ color: event.textColor, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                        {event.startTime}
                      </Text>
                    </Pressable>
                  ))}
                  {events.length > 4 ? (
                    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>+{events.length - 4}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
