import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppIcon } from '@/components/app-icon';
import { StaffAvatar } from '@/components/staff-avatar';
import type { StaffMember } from '@/lib/api/calendar';
import type { EventItem, WeekDayData } from '../types';
import { layoutTimelineEvents } from '../timeline-layout';
import { toDateKey } from '../date-utils';

const SCALE = 1.6;
const GUTTER = 48;
const HEADER = 56;
const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

type Props = {
  mode: 'dayGrid' | 'weekGrid'; days: WeekDayData[]; staff: StaffMember[];
  staffFilterId: string | null; width: number; loading: boolean;
  onNavigate: (direction: number) => void; onToday: () => void;
  onEvent: (event: EventItem) => void;
  onSlot: (date: string, time: string, staffId?: string) => void;
};

export function TimeGrid({ mode, days, staff, staffFilterId, width, loading, onNavigate, onToday, onEvent, onSlot }: Props) {
  const { t } = useTranslation();
  const theme = Colors[useColorScheme() ?? 'light'];
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const vertical = React.useRef<ScrollView>(null);
  const headerScroll = React.useRef<ScrollView>(null);
  const day = days[0];
  const columns = mode === 'weekGrid' ? days.map(d => ({
    key: d.dateKey, title: `${d.weekday.slice(0, 3)} ${d.date}`, date: d.dateKey,
    staffId: staffFilterId ?? undefined, member: undefined as StaffMember | undefined, events: d.appointments,
  })) : [
    ...staff.filter(s => !staffFilterId || s.id === staffFilterId).map(s => ({
      key: s.id, title: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(), date: day.dateKey,
      staffId: s.id, member: s, events: day.appointments.filter(e => e.staffIds.includes(s.id) || e.staffId === s.id),
    })),
    ...(!staffFilterId && (staff.length === 0 || day.appointments.some(e => !e.staffId && !e.staffIds.length)) ? [{
      key: 'unassigned', title: t('calendar.unassignedStaff'), date: day.dateKey, staffId: undefined,
      member: undefined, events: day.appointments.filter(e => !e.staffId && !e.staffIds.length),
    }] : []),
  ];
  const columnWidth = Math.max(mode === 'weekGrid' ? 106 : 142, (width - GUTTER) / Math.max(1, columns.length));
  const layouts = columns.map(c => layoutTimelineEvents(c.events, c.date));
  const firstMinute = Math.min(480, ...layouts.flat().map(e => Math.floor(e.start / 60) * 60));
  const lastMinute = Math.max(1200, ...layouts.flat().map(e => Math.ceil(e.end / 60) * 60));
  const height = (lastMinute - firstMinute) * SCALE;
  const slots = Array.from({ length: (lastMinute - firstMinute) / 15 }, (_, i) => firstMinute + i * 15);
  React.useEffect(() => {
    vertical.current?.scrollTo({ y: Math.max(0, (480 - firstMinute) * SCALE), animated: false });
  }, [mode, firstMinute]);
  return <View style={{ flex: 1 }}>
    <View style={s.toolbar}>
      <Pressable accessibilityLabel={t('calendar.previousPeriod')} style={s.control} onPress={() => onNavigate(-1)}><AppIcon name="chevronLeft" color={theme.text} size={20} /></Pressable>
      <Text style={[s.title, { color: theme.text }]} numberOfLines={1}>{days.length === 1 ? `${day.weekday} ${day.date}` : `${day.date} – ${days[6].date} ${days[6].weekday.slice(0, 3)}`}</Text>
      <Pressable accessibilityLabel={t('calendar.nextPeriod')} style={s.control} onPress={() => onNavigate(1)}><AppIcon name="chevronRight" color={theme.text} size={20} /></Pressable>
      <Pressable onPress={onToday} style={[s.today, { backgroundColor: theme.surface }]}><Text style={{ color: theme.text, fontWeight: '600' }}>{t('calendar.today')}</Text></Pressable>
    </View>
    <Text style={[s.hint, { color: theme.muted }]}>{t('calendar.timelineHint')}</Text>
    {loading ? <ActivityIndicator style={{ flex: 1 }} color={theme.tint} /> : <>
      <View style={{ flexDirection: 'row', height: HEADER }}>
        <View style={{ width: GUTTER, backgroundColor: theme.surface }} />
        <ScrollView ref={headerScroll} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
          {columns.map(column => <View key={column.key} style={[s.columnHeader, { width: columnWidth, backgroundColor: theme.surface, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
            {column.member ? <StaffAvatar imagePath={column.member.image_path} name={column.title} size={24} fontSize={10} /> : null}
            <Text numberOfLines={1} style={{ color: column.date === toDateKey(now) ? theme.tint : theme.muted, fontSize: 12, fontWeight: '600', flexShrink: 1 }}>{column.title}</Text>
          </View>)}
        </ScrollView>
      </View>
      <ScrollView ref={vertical} style={{ flex: 1 }} nestedScrollEnabled>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: GUTTER, backgroundColor: theme.background }}>
            {slots.map(minute => <View key={minute} style={{ height: 15 * SCALE }}><Text style={{ color: theme.muted, fontSize: 10, fontVariant: ['tabular-nums'] }}>{minute % 30 === 0 ? timeLabel(minute) : ''}</Text></View>)}
          </View>
          <ScrollView horizontal nestedScrollEnabled scrollEventThrottle={16} onScroll={event => headerScroll.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false })} style={{ width: width - GUTTER }}>
            <View style={{ flexDirection: 'row' }}>
              {columns.map((column, index) => <View key={column.key} style={{ width: columnWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                <View style={{ height }}>
                  {slots.map(minute => <Pressable key={minute} accessibilityLabel={`${column.title}, ${timeLabel(minute)}, ${t('appointment.title')}`} onPress={() => onSlot(column.date, timeLabel(minute), column.staffId)} style={{ height: 15 * SCALE, borderTopWidth: minute % 60 === 0 ? 1 : StyleSheet.hairlineWidth, borderColor: theme.border, backgroundColor: theme.background }} />)}
                  {layouts[index].map(({ event, start, end, lane, lanes }) => <Pressable key={event.id} accessibilityLabel={`${event.startTime}–${event.endTime}, ${event.clientName}, ${event.label}`} onPress={() => onEvent(event)} style={[s.event, { top: (start - firstMinute) * SCALE, height: (end - start) * SCALE - 1, left: lane * columnWidth / lanes + 2, width: columnWidth / lanes - 4, backgroundColor: event.bgColor, borderLeftColor: event.color }]}>
                    <Text numberOfLines={1} style={{ color: event.textColor, fontSize: 10 }}>{event.startTime}–{event.endTime}</Text>
                    <Text numberOfLines={2} style={{ color: event.textColor, fontSize: 12, fontWeight: '700' }}>{event.clientName}</Text>
                    <Text numberOfLines={2} style={{ color: event.textColor, fontSize: 11 }}>{event.label}</Text>
                    {mode === 'weekGrid' && !staffFilterId ? <Text numberOfLines={1} style={{ color: event.textColor, fontSize: 10 }}>{event.staffName}</Text> : null}
                  </Pressable>)}
                  {column.date === toDateKey(now) && now.getHours() * 60 + now.getMinutes() >= firstMinute && now.getHours() * 60 + now.getMinutes() < lastMinute ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (now.getHours() * 60 + now.getMinutes() - firstMinute) * SCALE, height: 2, backgroundColor: theme.error }} /> : null}
                </View>
              </View>)}
            </View>
          </ScrollView>
        </View>
      </ScrollView></>}
  </View>;
}
const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  today: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  hint: { fontSize: 11, marginBottom: 12, lineHeight: 16 },
  columnHeader: { height: HEADER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  event: { position: 'absolute', borderRadius: 6, borderLeftWidth: 3, padding: 4, overflow: 'hidden' },
});
