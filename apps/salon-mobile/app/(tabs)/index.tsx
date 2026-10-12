import { peekCalendarWarm } from '@/lib/calendar-warm';
import { readPreferredCalendarView, writePreferredCalendarView, type CalendarViewMode } from '@/lib/preferences';
import { TimeGrid } from '@/components/calendar/components/TimeGrid';
import { calendarPreviewLayout } from '@/lib/calendar-layout';
import { Pressable } from '@/components/pressable-scale';
import React from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CalendarGlass, CalendarGlassMenu } from '@/components/calendar/components/CalendarGlass';
import { AppIcon } from '@/components/app-icon';
import { SalonSelector } from '@/components/salon-selector';
import { TabScreen } from '@/components/tab-screen';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { StaffAvatar } from '@/components/staff-avatar';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { isAppointmentCanceled } from '@/lib/api/appointment-status';
import {
  fetchAppointmentById,
  fetchAppointmentsForMonth,
  fetchStaff,
  AppointmentRow,
  StaffMember,
} from '@/lib/api/calendar';

import {
  BASE_MONTH_INDEX,
  BASE_YEAR,
  LIST_MAX_LOADED_MONTHS,
  PREFETCH_FUTURE_MONTHS,
  PREFETCH_PAST_MONTHS,
} from '@/components/calendar/constants';
import {
  addDays,
  addMonths,
  getListHeaderLabel,
  getMonthShortLabel,
  getOffsetForDate,
  getWeekStartMonday,
  getWeekdayLong,
  getWeekdayShort,
  parseSalonWallClock,
  toDateKey,
} from '@/components/calendar/date-utils';
import {
  buildMonthData,
  groupAppointmentsByDateKey,
  monthCacheKey,
  removeAppointmentFromMonthCache,
  upsertAppointmentInMonthCache,
} from '@/components/calendar/calendar-data';
import {
  ListAgendaSkeleton,
  ListFooterSkeleton,
  MonthGridSkeleton,
} from '@/components/calendar/components/CalendarSkeletons';
import { ListEventRow } from '@/components/calendar/components/ListEventRow';
import { ListSectionHeader } from '@/components/calendar/components/ListSectionHeader';
import { createStyles } from '@/components/calendar/styles';
import { EventItem, ListFlatItem, MonthData, WeekDayData } from '@/components/calendar/types';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function buildPrefetchWindow(centerOffset: number): number[] {
  const span = PREFETCH_PAST_MONTHS + PREFETCH_FUTURE_MONTHS + 1;
  return Array.from({ length: span }, (_, i) => centerOffset - PREFETCH_PAST_MONTHS + i);
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = React.useState(width - 32);
  const { companyId } = useAuth();
  const { locationId, loading: locationLoading } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [calendarAreaHeight, setCalendarAreaHeight] = React.useState(0);
  const calendarHeight = calendarAreaHeight;
  // Dismiss menus urgently; filtering/view changes are interruptible transitions
  // so a calendar render does not hold up the native exit animation.
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [showStaffMenu, setShowStaffMenu] = React.useState(false);
  const [showMonthMenu, setShowMonthMenu] = React.useState(false);
  const [modeMenuPos, setModeMenuPos] = React.useState({ top: 0, right: 16 });
  const [staffMenuPos, setStaffMenuPos] = React.useState({ top: 0, left: 16, originX: 24 });
  const [monthMenuPos, setMonthMenuPos] = React.useState({ top: 0, left: 16, originX: 24 });
  const [pickerYear, setPickerYear] = React.useState(BASE_YEAR);
  const containerRef = React.useRef<View>(null);
  const modeButtonRef = React.useRef<View>(null);
  const staffChipRef = React.useRef<View>(null);
  const monthButtonRef = React.useRef<View>(null);
  const [viewMode, updateViewMode] = React.useState<CalendarViewMode>(() => peekCalendarWarm(companyId, locationId)?.view ?? 'month');
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = React.useState(() => Boolean(peekCalendarWarm(companyId, locationId)));
  React.useEffect(() => {
    let active = true;
    readPreferredCalendarView().then(mode => {
      if (!active) return;
      updateViewMode(mode === 'week' ? 'weekGrid' : mode);
      setViewPreferenceLoaded(true);
    });
    return () => { active = false; };
  }, []);
  const setViewMode = React.useCallback((mode: CalendarViewMode) => {
    updateViewMode(mode);
    void writePreferredCalendarView(mode);
  }, []);
  const [gridDate, setGridDate] = React.useState(() => toDateKey(new Date()));
  const [offsets, setOffsets] = React.useState(() => {
    const todayOffset = getOffsetForDate(new Date());
    return [todayOffset - 2, todayOffset - 1, todayOffset, todayOffset + 1, todayOffset + 2];
  });
  const [currentOffset, setCurrentOffset] = React.useState(() => getOffsetForDate(new Date()));
  const [listMonthOffsets, setListMonthOffsets] = React.useState(() =>
    buildPrefetchWindow(getOffsetForDate(new Date()))
  );
  const todayKey = React.useMemo(() => toDateKey(new Date()), []);
  const listRef = React.useRef<FlatList<number>>(null);
  const listAgendaRef = React.useRef<FlashListRef<ListFlatItem>>(null);
  const pendingListScrollRef = React.useRef<string | null>(null);
  const router = useRouter();
  const offsetsRef = React.useRef(offsets);
  const viewModeRef = React.useRef(viewMode);
  const prevViewModeRef = React.useRef(viewMode);

  const [staffList, setStaffList] = React.useState<StaffMember[]>(() => peekCalendarWarm(companyId, locationId)?.staff ?? []);
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [calendarEpoch, setCalendarEpoch] = React.useState(0);
  // Appointments are fetched one calendar month at a time (see loadMonth
  // below) rather than the whole company's history up front — cached here by
  // companyId + locationId + "YYYY-MM". A ref because it's a cache, not
  // something that should itself trigger renders; `loadingMonthKeys` (state)
  // does that instead. `scopeEpochRef` invalidates in-flight writes after a
  // shop switch so a late response cannot paint the previous location.
  const monthDataRef = React.useRef(new Map(peekCalendarWarm(companyId, locationId)?.months ?? []));
  const skipScopeReset = React.useRef(monthDataRef.current.size > 0);
  const inFlightMonthsRef = React.useRef(new Set<string>());
  const scopeEpochRef = React.useRef(0);
  const [loadingMonthKeys, setLoadingMonthKeys] = React.useState<Set<string>>(new Set());

  // Unfiltered per-day event groupings for the agenda list, cached per month
  // key so the same EventItem object references survive re-renders (staff
  // filter toggles, scroll-triggered growth, etc). Stable references let
  // FlashList/React.memo skip re-rendering rows whose data hasn't changed.
  // Invalidated in loadMonth whenever a month's appointments are (re)fetched.
  const monthEventsCacheRef = React.useRef(new Map<string, Record<string, EventItem[]>>());

  const monthKeyForOffset = React.useCallback(
    (offset: number) => {
      const { year, monthIndex } = addMonths(BASE_YEAR, BASE_MONTH_INDEX, offset);
      return {
        year,
        monthIndex,
        key: companyId && locationId ? monthCacheKey(companyId, locationId, year, monthIndex) : `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      };
    },
    [companyId, locationId]
  );

  const loadMonth = React.useCallback(
    async (offset: number, opts?: { force?: boolean }) => {
      if (!companyId || !locationId) return;
      const { year, monthIndex, key } = monthKeyForOffset(offset);
      const epoch = scopeEpochRef.current;

      if (inFlightMonthsRef.current.has(key)) return;
      if (!opts?.force && monthDataRef.current.has(key)) return;

      inFlightMonthsRef.current.add(key);
      setLoadingMonthKeys((prev) => new Set(prev).add(key));

      try {
        const data = await fetchAppointmentsForMonth(companyId, locationId, year, monthIndex);
        if (scopeEpochRef.current !== epoch) return;
        monthDataRef.current.set(key, data);
        monthEventsCacheRef.current.delete(`${key}:light`);
        monthEventsCacheRef.current.delete(`${key}:dark`);
        setError(null);
      } catch (err) {
        if (scopeEpochRef.current !== epoch) return;
        setError(err instanceof Error ? err.message : t('calendar.failedToLoadAppointments'));
      } finally {
        if (scopeEpochRef.current !== epoch) return;
        inFlightMonthsRef.current.delete(key);
        setLoadingMonthKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [companyId, locationId, monthKeyForOffset, t]
  );

  const loadStaff = React.useCallback(async () => {
    if (!companyId || !locationId) {
      return;
    }
    const epoch = scopeEpochRef.current;
    try {
      const data = await fetchStaff(companyId, locationId);
      if (scopeEpochRef.current !== epoch) return;
      setStaffList(data);
    } catch (err) {
      if (scopeEpochRef.current !== epoch) return;
      setError(err instanceof Error ? err.message : t('calendar.failedToLoadStaff'));
    }
  }, [companyId, locationId, t]);

  React.useEffect(() => {
    if (skipScopeReset.current) {
      skipScopeReset.current = false;
      return;
    }
    scopeEpochRef.current += 1;
    monthDataRef.current.clear();
    monthEventsCacheRef.current.clear();
    inFlightMonthsRef.current.clear();
    setLoadingMonthKeys(new Set());
    setSelectedStaffIds([]);
    setCalendarEpoch((value) => value + 1);
  }, [companyId, locationId]);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);


  // The set of month offsets the active view currently needs, unioned with a
  // PREFETCH_PAST_MONTHS/PREFETCH_FUTURE_MONTHS buffer around wherever the
  // user currently is. All three views share the same monthDataRef cache (see
  // loadMonth above), so this buffer is what lets swiping a few weeks/months
  // in either direction — or switching between month/week/list — land on
  // already-loaded data instead of triggering a fresh fetch at the boundary.
  const neededMonthOffsets = React.useMemo(() => {
    if (viewMode === 'dayGrid' || viewMode === 'weekGrid') {
      const start = viewMode === 'dayGrid' ? parseSalonWallClock(gridDate + 'T00:00:00') : getWeekStartMonday(parseSalonWallClock(gridDate + 'T00:00:00'));
      return Array.from(new Set([...buildPrefetchWindow(getOffsetForDate(start)), getOffsetForDate(addDays(start, 6))]));
    }
    if (viewMode === 'list') {
      return Array.from(new Set([...listMonthOffsets, ...buildPrefetchWindow(currentOffset)]));
    }
    return Array.from(new Set([...offsets, ...buildPrefetchWindow(currentOffset)]));
  }, [viewMode, gridDate, listMonthOffsets, offsets, currentOffset]);

  React.useEffect(() => {
    neededMonthOffsets.forEach((offset) => {
      loadMonth(offset);
    });
  }, [neededMonthOffsets, loadMonth]);

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    return Promise.all([
      loadStaff(),
      ...neededMonthOffsets.map((offset) => loadMonth(offset, { force: true })),
    ]).finally(() => setRefreshing(false));
  }, [loadStaff, loadMonth, neededMonthOffsets]);

  const isVisibleDataLoading = neededMonthOffsets.some((offset) => loadingMonthKeys.has(monthKeyForOffset(offset).key));

  const selectedStaff = selectedStaffIds.length === 1 ? staffList.find((staff) => staff.id === selectedStaffIds[0]) : undefined;
  const selectedStaffName = selectedStaffIds.length === 0
    ? t('calendar.allStaff')
    : selectedStaffIds.length === 1
      ? `${selectedStaff?.first_name ?? ''} ${selectedStaff?.last_name ?? ''}`.trim() || t('calendar.employee')
      : t('calendar.employeesSelected', { count: selectedStaffIds.length });

  const staffImageById = React.useMemo(() => {
    const map = new Map<string, string | null>();
    staffList.forEach((staff) => map.set(staff.id, staff.image_path));
    return map;
  }, [staffList]);

  React.useEffect(() => {
    offsetsRef.current = offsets;
  }, [offsets]);

  React.useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const fetchMonthData = React.useCallback(
    (offset: number): MonthData => {
      const { year, monthIndex, key } = monthKeyForOffset(offset);
      const monthAppointments = monthDataRef.current.get(key) ?? [];
      const eventsByDateKey = groupAppointmentsByDateKey(monthAppointments, selectedStaffIds, colorScheme);
      return buildMonthData(year, monthIndex, eventsByDateKey);
    },
    [monthKeyForOffset, selectedStaffIds, calendarEpoch, colorScheme]
  );

  const getMonthEventsByDateKey = React.useCallback(
    (offset: number): Record<string, EventItem[]> => {
      const { key } = monthKeyForOffset(offset);
      const cacheKey = `${key}:${colorScheme}`;
      let cached = monthEventsCacheRef.current.get(cacheKey);
      if (!cached) {
        const monthAppointments = monthDataRef.current.get(key) ?? [];
        cached = groupAppointmentsByDateKey(monthAppointments, null, colorScheme);
        monthEventsCacheRef.current.set(cacheKey, cached);
      }
      return cached;
    },
    [monthKeyForOffset, calendarEpoch, colorScheme]
  );

  const applyAppointmentChange = React.useCallback(
    async (appointmentId?: string) => {
      if (!companyId || !locationId) return;

      if (!appointmentId) {
        await Promise.all(neededMonthOffsets.map((offset) => loadMonth(offset, { force: true })));
        return;
      }

      try {
        const row = await fetchAppointmentById(appointmentId);
        removeAppointmentFromMonthCache(monthDataRef.current, appointmentId);

        const belongsHere =
          row &&
          !isAppointmentCanceled(row) &&
          (!row.location_id || row.location_id === locationId);

        if (belongsHere && row) {
          const start = parseSalonWallClock(row.start);
          const offset = getOffsetForDate(start);
          const { key } = monthKeyForOffset(offset);
          if (monthDataRef.current.has(key)) {
            upsertAppointmentInMonthCache(monthDataRef.current, key, row);
          } else {
            await loadMonth(offset);
          }
        }

        monthEventsCacheRef.current.clear();
        setCalendarEpoch((value) => value + 1);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('calendar.failedToLoadAppointments'));
      }
    },
    [companyId, locationId, loadMonth, monthKeyForOffset, neededMonthOffsets, t]
  );

  React.useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'calendarRefreshAppointments',
      (payload?: { appointmentId?: string }) => {
        applyAppointmentChange(payload?.appointmentId);
      }
    );
    return () => subscription.remove();
  }, [applyAppointmentChange]);

  const { activeYear, activeMonthIndex } =
    viewMode === 'dayGrid' || viewMode === 'weekGrid'
      ? { activeYear: Number(gridDate.slice(0, 4)), activeMonthIndex: Number(gridDate.slice(5, 7)) - 1 }
      : (() => {
          const { year, monthIndex } = monthKeyForOffset(currentOffset);
          return { activeYear: year, activeMonthIndex: monthIndex };
        })();
  const activeMonthLabel = `${getMonthShortLabel(activeMonthIndex)} ${activeYear}`;
  const gridAnchor = parseSalonWallClock(gridDate + 'T00:00:00');
  const gridPeriodLabel =
    viewMode === 'dayGrid'
      ? `${getWeekdayShort(gridAnchor)} ${gridAnchor.getDate()} ${getMonthShortLabel(gridAnchor.getMonth())}`
      : viewMode === 'weekGrid'
        ? (() => {
            const start = getWeekStartMonday(gridAnchor);
            const end = addDays(start, 6);
            return start.getMonth() === end.getMonth()
              ? `${start.getDate()}–${end.getDate()} ${getMonthShortLabel(end.getMonth())}`
              : `${start.getDate()} ${getMonthShortLabel(start.getMonth())} – ${end.getDate()} ${getMonthShortLabel(end.getMonth())}`;
          })()
        : null;

  React.useEffect(() => {
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

  React.useEffect(() => {
    if (viewMode !== 'list') return;
    setListMonthOffsets((prev) => (prev.includes(currentOffset) ? prev : buildPrefetchWindow(currentOffset)));
  }, [currentOffset, viewMode]);

  const goToToday = React.useCallback(() => {
    const today = new Date();
    setGridDate(toDateKey(today));
    const targetOffset = getOffsetForDate(today);
    const dateKey = toDateKey(today);
    const currentOffsets = offsetsRef.current;
    const currentViewMode = viewModeRef.current;

    if (!currentOffsets.includes(targetOffset)) {
      const nextOffsets = [
        targetOffset - 2,
        targetOffset - 1,
        targetOffset,
        targetOffset + 1,
        targetOffset + 2,
      ];
      setOffsets(nextOffsets);
      setCurrentOffset(targetOffset);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: 2, animated: false });
      });
      return;
    }

    setCurrentOffset(targetOffset);
    setListMonthOffsets(buildPrefetchWindow(targetOffset));

    if (currentViewMode === 'month') {
      requestAnimationFrame(() => {
        const index = currentOffsets.indexOf(targetOffset);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true });
        }
      });
    }

    if (currentViewMode === 'list') {
      pendingListScrollRef.current = dateKey;
    }
  }, []);

  /**
   * Jump to a month picked from the header's month/year menu. Unlike `goToToday`,
   * there's no specific day to center a week view on, so picking a month from
   * week view drops into month view — matching iOS Calendar's year-view behavior.
   */
  const goToMonth = React.useCallback((year: number, monthIndex: number) => {
    const target = new Date(year, monthIndex, 1);
    const targetOffset = getOffsetForDate(target);
    const currentOffsets = offsetsRef.current;
    setGridDate(toDateKey(target));
    const fromViewMode = viewModeRef.current;
    const switchingFromWeek = fromViewMode === 'week';
    const needsRecenter = !currentOffsets.includes(targetOffset);

    if (needsRecenter) {
      setOffsets([targetOffset - 2, targetOffset - 1, targetOffset, targetOffset + 1, targetOffset + 2]);
    }
    setCurrentOffset(targetOffset);
    setListMonthOffsets(buildPrefetchWindow(targetOffset));

    if (switchingFromWeek) {
      React.startTransition(() => setViewMode('month'));
    } else if (fromViewMode === 'month') {
      requestAnimationFrame(() => {
        const index = needsRecenter ? 2 : currentOffsets.indexOf(targetOffset);
        listRef.current?.scrollToIndex({ index, animated: !needsRecenter });
      });
    } else if (fromViewMode === 'list') {
      pendingListScrollRef.current = toDateKey(target);
    }
  }, []);

  // Flattened [header, row, row, ...] data for the agenda FlashList, with the
  // header indices FlashList needs to pin them via stickyHeaderIndices. Built
  // from the cached per-month groupings so EventItem object identity stays
  // stable across renders (React.memo on ListEventRow relies on this).
  const listFlatData = React.useMemo(() => {
    const items: ListFlatItem[] = [];
    const stickyHeaderIndices: number[] = [];

    listMonthOffsets
      .slice()
      .sort((a, b) => a - b)
      .forEach((monthOffset) => {
        const eventsByDateKey = getMonthEventsByDateKey(monthOffset);
        Object.keys(eventsByDateKey)
          .sort()
          .forEach((dateKey) => {
            const dayEvents = selectedStaffIds.length
              ? eventsByDateKey[dateKey].filter(
                  (event) => selectedStaffIds.some((staffId) => event.staffIds.includes(staffId) || event.staffId === staffId)
                )
              : eventsByDateKey[dateKey];
            if (!dayEvents || dayEvents.length === 0) return;

            stickyHeaderIndices.push(items.length);
            items.push({
              kind: 'header',
              key: `header-${dateKey}`,
              dateKey,
              title: getListHeaderLabel(dateKey),
              isToday: dateKey === todayKey,
            });
            dayEvents.forEach((event) => {
              items.push({ kind: 'row', key: event.id, dateKey, event });
            });
          });
      });

    return { items, stickyHeaderIndices };
  }, [getMonthEventsByDateKey, listMonthOffsets, loadingMonthKeys, selectedStaffIds, todayKey]);

  // Grows the loaded window forward by one month at a time, up to a cap.
  // Never drops already-loaded months (that eviction was what caused the
  // list to blank on fast scroll) — it's gated only by the array itself, so
  // repeated onEndReached calls while scrolling fast are naturally no-ops
  // once the next month is already in the window.
  const handleListLoadMore = React.useCallback(() => {
    setListMonthOffsets((prev) => {
      const highest = Math.max(...prev);
      const lowest = Math.min(...prev);
      if (highest - lowest + 1 >= LIST_MAX_LOADED_MONTHS || prev.includes(highest + 1)) {
        return prev;
      }
      return [...prev, highest + 1];
    });
  }, []);

  const listLoadingMore = React.useMemo(() => {
    if (viewMode !== 'list' || listMonthOffsets.length === 0) return false;
    const highest = Math.max(...listMonthOffsets);
    return loadingMonthKeys.has(monthKeyForOffset(highest).key);
  }, [listMonthOffsets, loadingMonthKeys, monthKeyForOffset, viewMode]);

  React.useEffect(() => {
    if (viewMode !== 'list' || !pendingListScrollRef.current) return;
    const targetDateKey = pendingListScrollRef.current;
    const index = listFlatData.items.findIndex((item) => item.kind === 'header' && item.dateKey === targetDateKey);
    if (index < 0) return;
    pendingListScrollRef.current = null;
    listAgendaRef.current?.scrollToIndex({ index, animated: true });
  }, [listFlatData, viewMode]);

  const handleMonthChange = React.useCallback(
    (index: number) => {
      const offset = offsets[index];
      if (offset === undefined) return;

      setCurrentOffset(offset);

      if (index <= 1) {
        const first = offsets[0];
        const prepend = [first - 3, first - 2, first - 1];
        const nextOffsets = [...prepend, ...offsets];
        setOffsets(nextOffsets);
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index: index + prepend.length, animated: false });
        });
      }

      if (index >= offsets.length - 2) {
        const last = offsets[offsets.length - 1];
        setOffsets([...offsets, last + 1, last + 2, last + 3]);
      }
    },
    [offsets]
  );

  const listKeyExtractor = React.useCallback((item: ListFlatItem) => item.key, []);

  const listGetItemType = React.useCallback((item: ListFlatItem) => item.kind, []);

  const handleListEventPress = React.useCallback(
    (event: EventItem) => {
      router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } });
    },
    [router]
  );

  const openDaySheet = React.useCallback(
    (dateKey: string) => {
      router.push({
        pathname: '/day/[date]',
        params: { date: dateKey, ...(selectedStaffIds.length === 1 ? { staffId: selectedStaffIds[0] } : {}) },
      });
    },
    [router, selectedStaffIds]
  );

  const renderListItem = React.useCallback(
    ({ item }: { item: ListFlatItem }) => {
      if (item.kind === 'header') {
        return <ListSectionHeader title={item.title} isToday={item.isToday} styles={styles} />;
      }
      return <ListEventRow event={item.event} onPress={handleListEventPress} styles={styles} />;
    },
    [handleListEventPress, styles]
  );

  const renderMonthGrid = React.useCallback(
    (monthData: MonthData) => {
      const weeksToRender = [...monthData.weeks];
      while (weeksToRender.length > 5 && !weeksToRender[weeksToRender.length - 1].days.some((day) => day.inMonth)) {
        weeksToRender.pop();
      }

      return (
        <View style={styles.monthGrid}>
          {weeksToRender.map((week) => (
            <View key={`${monthData.key}-${week.weekNumber}`} style={styles.weekRow}>
              {week.days.map((day) => {
                const events = monthData.events[day.dateKey] ?? [];
                const preview = calendarPreviewLayout(calendarHeight / weeksToRender.length, fontScale, events.length);
                const visibleEvents = events.slice(0, preview.visibleCount);
                const hiddenCount = preview.hiddenCount;
                const isToday = day.dateKey === todayKey;

                return (
                  <Pressable
                    key={day.dateKey}
                    style={styles.dayCell}
                    accessibilityRole="button"
                    accessibilityLabel={`${day.dateKey}, ${events.length} ${t('appointment.services')}`}
                    onPress={() => openDaySheet(day.dateKey)}>
                    <View style={styles.dayHeader}>
                      <View
                        style={[
                          styles.dayNumberWrapper,
                          { height: preview.headerHeight },
                          isToday ? styles.todayRingCircle : undefined,
                        ]}>
                        <Text
                          style={[
                            styles.dayNumber,
                            !day.inMonth && styles.dayNumberMuted,
                            day.isSunday && styles.dayNumberSunday,
                            isToday && styles.dayNumberToday,
                          ]}>
                          {day.date}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.eventStack}>
                      {visibleEvents.map((event) => (
                        <View key={event.id} style={[styles.eventPill, { backgroundColor: event.bgColor }]}>
                          <Text style={[styles.eventText, { color: event.textColor, lineHeight: preview.lineHeight }]} numberOfLines={1}>
                            {event.label}
                          </Text>
                        </View>
                      ))}
                      {preview.showMore ? (
                        <View style={styles.morePill}>
                          <Text style={[styles.moreText, { lineHeight: preview.lineHeight }]} numberOfLines={1}>{`+${hiddenCount}`}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      );
    },
    [calendarHeight, fontScale, openDaySheet, styles, t, todayKey]
  );

  const menuWidth = Math.min(280, width - 24);
  const staffMenuWidth = Math.min(300, width - 24);
  const monthMenuWidth = Math.min(300, width - 24);

  const openModeMenu = React.useCallback(() => {
    if (showModeMenu) {
      setShowModeMenu(false);
      return;
    }
    setShowStaffMenu(false);
    setShowMonthMenu(false);
    modeButtonRef.current?.measureInWindow((bx, by, bw, bh) => {
      containerRef.current?.measureInWindow((cx, cy, cw) => {
        setModeMenuPos({
          top: by - cy + bh + 8,
          right: Math.min(Math.max(12, cx + cw - (bx + bw)), Math.max(12, cw - menuWidth - 12)),
        });
        setShowModeMenu(true);
      });
    });
  }, [showModeMenu, menuWidth]);

  const openStaffMenu = React.useCallback(() => {
    if (showStaffMenu) {
      setShowStaffMenu(false);
      return;
    }
    setShowModeMenu(false);
    setShowMonthMenu(false);
    staffChipRef.current?.measureInWindow((bx, by, bw, bh) => {
      containerRef.current?.measureInWindow((cx, cy, cw) => {
        const maxLeft = Math.max(12, cw - staffMenuWidth - 12);
        setStaffMenuPos({
          top: by - cy + bh + 8,
          left: Math.min(Math.max(12, bx - cx), maxLeft),
          originX: bx - cx + bw / 2 - Math.min(Math.max(12, bx - cx), maxLeft),
        });
        setShowStaffMenu(true);
      });
    });
  }, [showStaffMenu, staffMenuWidth]);

  const openMonthMenu = React.useCallback(() => {
    if (showMonthMenu) {
      setShowMonthMenu(false);
      return;
    }
    setShowModeMenu(false);
    setShowStaffMenu(false);
    setPickerYear(activeYear);
    monthButtonRef.current?.measureInWindow((bx, by, bw, bh) => {
      containerRef.current?.measureInWindow((cx, cy, cw) => {
        const maxLeft = Math.max(12, cw - monthMenuWidth - 12);
        const left = Math.min(Math.max(12, bx - cx), maxLeft);
        setMonthMenuPos({ top: by - cy + bh + 8, left, originX: bx - cx + bw / 2 - left });
        setShowMonthMenu(true);
      });
    });
  }, [showMonthMenu, monthMenuWidth, activeYear]);

  const selectPickerMonth = React.useCallback(
    (monthIndex: number) => {
      Haptics.selectionAsync();
      setShowMonthMenu(false);
      goToMonth(pickerYear, monthIndex);
    },
    [goToMonth, pickerYear]
  );

  const jumpToToday = React.useCallback(() => {
    Haptics.selectionAsync();
    setShowMonthMenu(false);
    goToToday();
  }, [goToToday]);

  const showNoCompanyState = !locationLoading && !companyId;
  const showNoLocationState = !locationLoading && !!companyId && !locationId;

  if (!viewPreferenceLoaded) {
    return <TabScreen><MonthGridSkeleton styles={styles} /></TabScreen>;
  }

  return (
    <TabScreen>
    <>
      {showNoCompanyState ? (
        <EmptyState icon="calendar" title={t('calendar.noCompany')} />
      ) : showNoLocationState ? (
        <EmptyState icon="calendar" title={t('calendar.noLocation')} />
      ) : (
        <View style={styles.container} ref={containerRef} collapsable={false}>
          <View style={styles.scrollContent}>
            <View style={styles.headerBlock}>
              <View style={styles.headerRow}>
                {gridPeriodLabel ? (
                  <Pressable
                    accessibilityLabel={t('calendar.previousPeriod')}
                    hitSlop={8}
                    style={styles.periodStep}
                    onPress={() => setGridDate(toDateKey(addDays(gridAnchor, viewMode === 'weekGrid' ? -7 : -1)))}>
                    <AppIcon name="chevronLeft" size={22} color={theme.text} />
                  </Pressable>
                ) : null}
                <Pressable
                  ref={monthButtonRef}
                  collapsable={false}
                  accessibilityLabel={gridPeriodLabel ?? activeMonthLabel}
                  accessibilityState={{ expanded: showMonthMenu }}
                  style={styles.monthRow}
                  onPress={openMonthMenu}
                  hitSlop={8}>
                  <Text style={styles.monthText} numberOfLines={1}>
                    {gridPeriodLabel ?? activeMonthLabel}
                  </Text>
                  <AppIcon name="arrowDown" size={16} color={theme.muted} />
                </Pressable>
                {gridPeriodLabel ? (
                  <Pressable
                    accessibilityLabel={t('calendar.nextPeriod')}
                    hitSlop={8}
                    style={styles.periodStep}
                    onPress={() => setGridDate(toDateKey(addDays(gridAnchor, viewMode === 'weekGrid' ? 7 : 1)))}>
                    <AppIcon name="chevronRight" size={22} color={theme.text} />
                  </Pressable>
                ) : null}

                <CalendarGlass style={styles.headerIcons}>
                  <Pressable ref={staffChipRef} collapsable={false} accessibilityLabel={`${t('calendar.employee')}: ${selectedStaffName}`} accessibilityState={{ expanded: showStaffMenu }} style={styles.iconButton} onPress={openStaffMenu}>
                    {selectedStaff ? <StaffAvatar imagePath={selectedStaff.image_path} name={selectedStaffName} size={26} fontSize={11} /> : <AppIcon name="peopleOutline" size={22} color={theme.text} />}
                  </Pressable>
                  <Pressable ref={modeButtonRef} collapsable={false} accessibilityLabel={`${t('calendar.month')}, ${t('calendar.week')}, ${t('calendar.list')}, ${t('calendar.dayGrid')}, ${t('calendar.weekGrid')}`} accessibilityState={{ expanded: showModeMenu }} style={styles.iconButton} onPress={openModeMenu}>
                    <AppIcon name={viewMode === 'month' ? 'calendar' : viewMode === 'dayGrid' ? 'schedule' : viewMode === 'weekGrid' || viewMode === 'week' ? 'viewWeek' : 'viewList'} size={22} color={theme.text} />
                  </Pressable>
                  <Pressable accessibilityLabel={t('calendar.addTitle')} style={styles.iconButton} onPress={() => router.push({ pathname: '/calendar-add', params: { date: viewMode === 'dayGrid' ? gridDate : todayKey, ...(selectedStaff ? { staffId: selectedStaff.id } : {}) } })}>
                    <AppIcon name="add" size={24} color={theme.text} />
                  </Pressable>
                </CalendarGlass>
              </View>

              <SalonSelector />

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText} numberOfLines={2}>
                    {error}
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={12} onPress={handleRefresh}>
                    <Text style={styles.errorBannerRetry}>{t('calendar.retry')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.calendarArea} onLayout={({ nativeEvent: { layout } }) => {
              setCalendarAreaHeight(layout.height);
              setGridWidth(layout.width);
            }}>
              {viewMode === 'dayGrid' || (viewMode === 'weekGrid' && selectedStaffIds.length === 1) ? (() => {
                const start = viewMode === 'weekGrid' ? getWeekStartMonday(parseSalonWallClock(gridDate + 'T00:00:00')) : parseSalonWallClock(gridDate + 'T00:00:00');
                const days = Array.from({ length: viewMode === 'weekGrid' ? 7 : 1 }, (_, i) => {
                  const date = addDays(start, i);
                  const dateKey = toDateKey(date);
                  return { dateKey, date: date.getDate(), weekday: getWeekdayLong(date), isSunday: date.getDay() === 0, appointments: [
                    ...(fetchMonthData(getOffsetForDate(date)).events[dateKey] ?? []),
                    ...(fetchMonthData(getOffsetForDate(addDays(date, -1))).events[toDateKey(addDays(date, -1))] ?? []).filter(event => event.endISO > dateKey + 'T00:00:00'),
                  ] };
                });
                const loading = days.some(day => !monthDataRef.current.has(monthKeyForOffset(getOffsetForDate(parseSalonWallClock(day.dateKey + 'T00:00:00'))).key));
                return <TimeGrid mode={viewMode} days={days} staff={staffList} staffFilterId={selectedStaffIds.length === 1 ? selectedStaffIds[0] : null} selectedStaffIds={selectedStaffIds} width={gridWidth} loading={loading}
                  onNavigate={direction => setGridDate(toDateKey(addDays(parseSalonWallClock(gridDate + 'T00:00:00'), direction * (viewMode === 'weekGrid' ? 7 : 1))))}
                  onToday={jumpToToday}
                  onEvent={event => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })}
                  onSlot={(date, time, staffId) => router.push({ pathname: '/appointment-new', params: { date, time, ...(staffId ? { staffId } : {}) } })} />;
              })() : null}
              {viewMode === 'month' ? (
                <FlatList
                  ref={listRef}
                  data={offsets}
                  keyExtractor={(item) => `month-${item}`}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={offsets.indexOf(currentOffset)}
                  showsHorizontalScrollIndicator={false}
                  style={[styles.monthPager, { height: calendarHeight }]}
                  getItemLayout={(_, index) => ({ length: gridWidth, offset: gridWidth * index, index })}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / gridWidth);
                    handleMonthChange(index);
                  }}
                  renderItem={({ item }) => {
                    const { key } = monthKeyForOffset(item);
                    const ready = monthDataRef.current.has(key);
                    const loading = loadingMonthKeys.has(key);
                    return (
                      <View style={{ width: gridWidth, height: calendarHeight }}>
                        {!ready && (loading || locationLoading) ? (
                          <MonthGridSkeleton styles={styles} />
                        ) : (
                          renderMonthGrid(fetchMonthData(item))
                        )}
                      </View>
                    );
                  }}
                />
              ) : null}

              {viewMode === 'weekGrid' && selectedStaffIds.length !== 1 ? (() => {
                const weekStart = getWeekStartMonday(parseSalonWallClock(gridDate + 'T00:00:00'));
                const weekDays = Array.from({ length: 7 }, (_, index) => {
                  const date = addDays(weekStart, index);
                  const dateKey = toDateKey(date);
                  const currentEvents = fetchMonthData(getOffsetForDate(date)).events[dateKey] ?? [];
                  const previousDate = addDays(date, -1);
                  const carryOver = fetchMonthData(getOffsetForDate(previousDate)).events[toDateKey(previousDate)]?.filter((event) => event.endISO.slice(0, 10) > dateKey) ?? [];
                  return { dateKey, date: date.getDate(), weekday: getWeekdayShort(date), isSunday: date.getDay() === 0, appointments: [...currentEvents, ...carryOver] };
                });
                const isLoading = weekDays.some((day) => !monthDataRef.current.has(monthKeyForOffset(getOffsetForDate(parseSalonWallClock(day.dateKey + 'T00:00:00'))).key));
                return <TimeGrid mode="weekGrid" days={weekDays} staff={staffList} staffFilterId={null} selectedStaffIds={selectedStaffIds} width={gridWidth} loading={isLoading && isVisibleDataLoading} onNavigate={(direction) => setGridDate(toDateKey(addDays(parseSalonWallClock(gridDate + 'T00:00:00'), direction * 7)))} onToday={jumpToToday} onEvent={(event) => router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })} onSlot={(date, time, staffId) => router.push({ pathname: '/appointment-new', params: { date, time, ...(staffId ? { staffId } : {}) } })} />;
              })() : null}

              {viewMode === 'list' ? (
                <FlashList
                  ref={listAgendaRef}
                  data={listFlatData.items}
                  keyExtractor={listKeyExtractor}
                  getItemType={listGetItemType}
                  stickyHeaderIndices={listFlatData.stickyHeaderIndices}
                  showsVerticalScrollIndicator={false}
                  style={styles.listFullBleed}
                  contentContainerStyle={[
                    styles.listContent,
                    listFlatData.items.length === 0 ? styles.listEmptyContent : null,
                  ]}
                  onEndReachedThreshold={0.4}
                  onEndReached={handleListLoadMore}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  ListFooterComponent={listLoadingMore ? <ListFooterSkeleton styles={styles} /> : null}
                  ListEmptyComponent={
                    isVisibleDataLoading || locationLoading ? (
                      <ListAgendaSkeleton styles={styles} />
                    ) : (
                      <EmptyState
                        icon="eventBusy"
                        title={t('calendar.noAppointmentsFound')}
                        subtitle={t('calendar.noAppointmentsFoundHint')}
                        actionLabel={t('appointment.title')}
                        onAction={() =>
                          router.push({
                            pathname: '/appointment-new',
                            params: { date: todayKey },
                          })
                        }
                      />
                    )
                  }
                  renderItem={renderListItem}
                />
              ) : null}
            </View>
          </View>

          {showModeMenu ? (
            <>
              <Pressable accessibilityLabel={t('common.close')} style={styles.menuOverlay} onPress={() => setShowModeMenu(false)} />
              <CalendarGlassMenu originX={menuWidth - 24} onAccessibilityEscape={() => setShowModeMenu(false)} style={[styles.modeMenu, { top: modeMenuPos.top, right: modeMenuPos.right, width: menuWidth }]}>
                <Pressable
                  style={styles.modeItemActive}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowModeMenu(false);
                    React.startTransition(() => setViewMode('month'));
                  }}>
                  <AppIcon name="calendar" size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t('calendar.month')}</Text>
                  {viewMode === 'month' ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                </Pressable>
                <Pressable
                  style={styles.modeItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowModeMenu(false);
                    React.startTransition(() => setViewMode('list'));
                  }}>
                  <AppIcon name="viewList" size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t('calendar.list')}</Text>
                  {viewMode === 'list' ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                </Pressable>
                {(['dayGrid', 'weekGrid'] as const).map(mode => (
                  <Pressable key={mode} style={styles.modeItem} onPress={() => {
                    Haptics.selectionAsync();
                    setShowModeMenu(false);
                    if (viewMode === 'month' || viewMode === 'list') {
                      const { year, monthIndex } = monthKeyForOffset(currentOffset);
                      const now = new Date();
                      setGridDate(toDateKey(now.getFullYear() === year && now.getMonth() === monthIndex ? now : new Date(year, monthIndex, 1)));
                    }
                    React.startTransition(() => setViewMode(mode));
                  }}>
                    <AppIcon name={mode === 'dayGrid' ? 'schedule' : 'viewWeek'} size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t(`calendar.${mode}`)}</Text>
                    {viewMode === mode ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                  </Pressable>
                ))}
              </CalendarGlassMenu>
            </>
          ) : null}

          {showStaffMenu ? (
            <>
              <Pressable accessibilityLabel={t('common.close')} style={styles.menuOverlay} onPress={() => setShowStaffMenu(false)} />
              <CalendarGlassMenu originX={staffMenuPos.originX} onAccessibilityEscape={() => setShowStaffMenu(false)} style={[styles.staffMenu, { top: staffMenuPos.top, left: staffMenuPos.left, width: staffMenuWidth }]}>
                <ScrollView>
                  <Pressable
                    style={styles.staffMenuItem}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowStaffMenu(false);
                      React.startTransition(() => setSelectedStaffIds([]));
                    }}>
                    <View style={styles.staffMenuAvatar}>
                      <AppIcon name="groups" size={14} color={theme.muted} />
                    </View>
                    <Text style={styles.staffMenuName}>{t('calendar.allStaff')}</Text>
                    {selectedStaffIds.length === 0 ? <AppIcon name="check" size={18} color={theme.tint} /> : null}
                  </Pressable>
                  {staffList.map((staff) => {
                    const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                    return (
                      <Pressable
                        key={staff.id}
                        style={styles.staffMenuItem}
                        onPress={() => {
                          Haptics.selectionAsync();
                          React.startTransition(() => setSelectedStaffIds((current) => current.includes(staff.id) ? current.filter((id) => id !== staff.id) : [...current, staff.id]));
                        }}>
                        <StaffAvatar imagePath={staff.image_path} name={name} size={24} fontSize={10} />
                        <Text style={styles.staffMenuName}>{name}</Text>
                        {selectedStaffIds.includes(staff.id) ? <AppIcon name="check" size={18} color={theme.tint} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </CalendarGlassMenu>
            </>
          ) : null}

          {showMonthMenu ? (
            <>
              <Pressable accessibilityLabel={t('common.close')} style={styles.menuOverlay} onPress={() => setShowMonthMenu(false)} />
              <CalendarGlassMenu originX={monthMenuPos.originX} onAccessibilityEscape={() => setShowMonthMenu(false)} style={[styles.monthMenu, { top: monthMenuPos.top, left: monthMenuPos.left, width: monthMenuWidth }]}>
                <Pressable style={styles.modeItem} onPress={jumpToToday}>
                  <AppIcon name="calendar" size={20} color={theme.tint} />
                  <Text style={[styles.modeText, { color: theme.tint }]}>{t('calendar.today')}</Text>
                </Pressable>
                <View style={styles.monthPickerYearRow}>
                  <Pressable
                    accessibilityLabel={String(pickerYear - 1)}
                    hitSlop={8}
                    style={styles.monthPickerYearButton}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPickerYear((year) => year - 1);
                    }}>
                    <AppIcon name="chevronLeft" size={18} color={theme.text} />
                  </Pressable>
                  <Text style={styles.monthPickerYearText}>{pickerYear}</Text>
                  <Pressable
                    accessibilityLabel={String(pickerYear + 1)}
                    hitSlop={8}
                    style={styles.monthPickerYearButton}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPickerYear((year) => year + 1);
                    }}>
                    <AppIcon name="chevronRight" size={18} color={theme.text} />
                  </Pressable>
                </View>
                <View style={styles.monthPickerGrid}>
                  {Array.from({ length: 12 }, (_, monthIndex) => {
                    const active = pickerYear === activeYear && monthIndex === activeMonthIndex;
                    return (
                      <Pressable
                        key={monthIndex}
                        style={styles.monthPickerCellWrap}
                        onPress={() => selectPickerMonth(monthIndex)}>
                        <View style={[styles.monthPickerCell, active && styles.monthPickerCellActive]}>
                          <Text style={[styles.monthPickerCellText, active && styles.monthPickerCellTextActive]}>
                            {getMonthShortLabel(monthIndex)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </CalendarGlassMenu>
            </>
          ) : null}
        </View>
      )}
    </>
    </TabScreen>
  );
}
