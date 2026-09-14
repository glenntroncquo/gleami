import { calendarPreviewLayout } from '@/lib/calendar-layout';
import { Pressable } from '@/components/pressable-scale';
import React from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
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
  WEEK_CENTER_INDEX,
  WEEK_PAGE_COUNT,
} from '@/components/calendar/constants';
import {
  addDays,
  addMonths,
  getListHeaderLabel,
  getMonthShortLabel,
  getOffsetForDate,
  getWeekOffsetFromBase,
  getWeekStartMonday,
  getWeekdayLong,
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
  WeekAgendaSkeleton,
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
  const styles = createStyles(theme);
  const [calendarAreaHeight, setCalendarAreaHeight] = React.useState(0);
  const calendarHeight = calendarAreaHeight;
  const weekRowFixedHeight = calendarHeight / 7;
  const compactHeader = gridWidth < 380 || fontScale > 1.2;
  const [showModeMenu, setShowModeMenu] = React.useState(false);
  const [showStaffMenu, setShowStaffMenu] = React.useState(false);
  const [modeMenuPos, setModeMenuPos] = React.useState({ top: 0, right: 16 });
  const [staffMenuPos, setStaffMenuPos] = React.useState({ top: 0, left: 16 });
  const containerRef = React.useRef<View>(null);
  const modeButtonRef = React.useRef<View>(null);
  const staffChipRef = React.useRef<View>(null);
  const [viewMode, setViewMode] = React.useState<'month' | 'week' | 'list'>('month');
  const [offsets, setOffsets] = React.useState(() => {
    const todayOffset = getOffsetForDate(new Date());
    return [todayOffset - 2, todayOffset - 1, todayOffset, todayOffset + 1, todayOffset + 2];
  });
  const [currentOffset, setCurrentOffset] = React.useState(() => getOffsetForDate(new Date()));
  const [listMonthOffsets, setListMonthOffsets] = React.useState(() =>
    buildPrefetchWindow(getOffsetForDate(new Date()))
  );
  const weekOffsets = React.useMemo(
    () => Array.from({ length: WEEK_PAGE_COUNT }, (_, i) => i - WEEK_CENTER_INDEX),
    []
  );
  const [currentWeekIndex, setCurrentWeekIndex] = React.useState(WEEK_CENTER_INDEX);
  const todayKey = React.useMemo(() => toDateKey(new Date()), []);
  const listRef = React.useRef<FlatList<number>>(null);
  const weekListRef = React.useRef<FlatList<number>>(null);
  const listAgendaRef = React.useRef<FlashListRef<ListFlatItem>>(null);
  const pendingListScrollRef = React.useRef<string | null>(null);
  const weekProgrammaticScrollRef = React.useRef(false);
  const router = useRouter();
  const offsetsRef = React.useRef(offsets);
  const viewModeRef = React.useRef(viewMode);
  const prevViewModeRef = React.useRef(viewMode);

  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [staffFilterId, setStaffFilterId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [calendarEpoch, setCalendarEpoch] = React.useState(0);
  // Appointments are fetched one calendar month at a time (see loadMonth
  // below) rather than the whole company's history up front — cached here by
  // companyId + locationId + "YYYY-MM". A ref because it's a cache, not
  // something that should itself trigger renders; `loadingMonthKeys` (state)
  // does that instead. `scopeEpochRef` invalidates in-flight writes after a
  // shop switch so a late response cannot paint the previous location.
  const monthDataRef = React.useRef(new Map<string, AppointmentRow[]>());
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
        monthEventsCacheRef.current.delete(key);
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
    scopeEpochRef.current += 1;
    monthDataRef.current.clear();
    monthEventsCacheRef.current.clear();
    inFlightMonthsRef.current.clear();
    setLoadingMonthKeys(new Set());
    setStaffFilterId(null);
    setCalendarEpoch((value) => value + 1);
  }, [companyId, locationId]);

  React.useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const baseWeekStart = React.useMemo(() => getWeekStartMonday(new Date()), []);

  // The set of month offsets the active view currently needs, unioned with a
  // PREFETCH_PAST_MONTHS/PREFETCH_FUTURE_MONTHS buffer around wherever the
  // user currently is. All three views share the same monthDataRef cache (see
  // loadMonth above), so this buffer is what lets swiping a few weeks/months
  // in either direction — or switching between month/week/list — land on
  // already-loaded data instead of triggering a fresh fetch at the boundary.
  const neededMonthOffsets = React.useMemo(() => {
    if (viewMode === 'week') {
      const weekOffset = weekOffsets[currentWeekIndex] ?? 0;
      const weekStart = addDays(baseWeekStart, weekOffset * 7);
      const offsetsSet = new Set<number>();
      for (let i = 0; i < 7; i += 1) {
        offsetsSet.add(getOffsetForDate(addDays(weekStart, i)));
      }
      buildPrefetchWindow(getOffsetForDate(weekStart)).forEach((offset) => offsetsSet.add(offset));
      return Array.from(offsetsSet);
    }
    if (viewMode === 'list') {
      return Array.from(new Set([...listMonthOffsets, ...buildPrefetchWindow(currentOffset)]));
    }
    return Array.from(new Set([...offsets, ...buildPrefetchWindow(currentOffset)]));
  }, [viewMode, weekOffsets, currentWeekIndex, baseWeekStart, listMonthOffsets, offsets, currentOffset]);

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

  const selectedStaff = staffFilterId ? staffList.find((staff) => staff.id === staffFilterId) : undefined;
  const selectedStaffName = selectedStaff
    ? `${selectedStaff.first_name ?? ''} ${selectedStaff.last_name ?? ''}`.trim() || t('calendar.employee')
    : t('calendar.allStaff');

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
      const eventsByDateKey = groupAppointmentsByDateKey(monthAppointments, staffFilterId);
      return buildMonthData(year, monthIndex, eventsByDateKey);
    },
    [monthKeyForOffset, staffFilterId, calendarEpoch]
  );

  const getMonthEventsByDateKey = React.useCallback(
    (offset: number): Record<string, EventItem[]> => {
      const { key } = monthKeyForOffset(offset);
      let cached = monthEventsCacheRef.current.get(key);
      if (!cached) {
        const monthAppointments = monthDataRef.current.get(key) ?? [];
        cached = groupAppointmentsByDateKey(monthAppointments, null);
        monthEventsCacheRef.current.set(key, cached);
      }
      return cached;
    },
    [monthKeyForOffset, calendarEpoch]
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

  const fetchWeekData = React.useCallback(
    (weekOffset: number): WeekDayData[] => {
      const weekStart = addDays(baseWeekStart, weekOffset * 7);
      return Array.from({ length: 7 }, (_, dayOffset) => {
        const dayDate = addDays(weekStart, dayOffset);
        const dateKey = toDateKey(dayDate);
        const monthOffset = getOffsetForDate(dayDate);
        const monthData = fetchMonthData(monthOffset);
        return {
          dateKey,
          date: dayDate.getDate(),
          weekday: getWeekdayLong(dayDate),
          isSunday: dayDate.getDay() === 0,
          appointments: monthData.events[dateKey] ?? [],
        };
      });
    },
    [baseWeekStart, fetchMonthData]
  );

  const currentWeekOffset = weekOffsets[currentWeekIndex] ?? 0;
  const currentWeekDays = fetchWeekData(currentWeekOffset);
  const activeMonthLabel =
    viewMode === 'week'
      ? (() => {
          const weekDate = new Date(currentWeekDays[0]?.dateKey ?? todayKey);
          return `${getMonthShortLabel(weekDate.getMonth())} ${weekDate.getFullYear()}`;
        })()
      : (() => {
          const { year, monthIndex } = monthKeyForOffset(currentOffset);
          return `${getMonthShortLabel(monthIndex)} ${year}`;
        })();

  React.useEffect(() => {
    const prevMode = prevViewModeRef.current;
    prevViewModeRef.current = viewMode;
    if (viewMode !== 'week' || prevMode === 'week') return;

    const targetWeekOffset = getWeekOffsetFromBase(baseWeekStart, todayKey);
    const targetIndex = WEEK_CENTER_INDEX + targetWeekOffset;
    if (targetIndex < 0 || targetIndex >= WEEK_PAGE_COUNT) return;

    setCurrentWeekIndex(targetIndex);
    requestAnimationFrame(() => {
      weekProgrammaticScrollRef.current = true;
      weekListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      setTimeout(() => {
        weekProgrammaticScrollRef.current = false;
      }, 120);
    });
  }, [baseWeekStart, viewMode, todayKey]);

  React.useEffect(() => {
    if (viewMode !== 'list') return;
    setListMonthOffsets((prev) => (prev.includes(currentOffset) ? prev : buildPrefetchWindow(currentOffset)));
  }, [currentOffset, viewMode]);

  const goToToday = React.useCallback(() => {
    const today = new Date();
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
    setCurrentWeekIndex(WEEK_CENTER_INDEX);
    setListMonthOffsets(buildPrefetchWindow(targetOffset));

    if (currentViewMode === 'month') {
      requestAnimationFrame(() => {
        const index = currentOffsets.indexOf(targetOffset);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true });
        }
      });
    }

    if (currentViewMode === 'week') {
      requestAnimationFrame(() => {
        weekProgrammaticScrollRef.current = true;
        weekListRef.current?.scrollToIndex({ index: WEEK_CENTER_INDEX, animated: true });
        setTimeout(() => {
          weekProgrammaticScrollRef.current = false;
        }, 260);
      });
    }

    if (currentViewMode === 'list') {
      pendingListScrollRef.current = dateKey;
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
            const dayEvents = staffFilterId
              ? eventsByDateKey[dateKey].filter(
                  (event) => event.staffIds.includes(staffFilterId) || event.staffId === staffFilterId
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
  }, [getMonthEventsByDateKey, listMonthOffsets, loadingMonthKeys, staffFilterId, todayKey]);

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

  const handleWeekChange = React.useCallback(
    (index: number) => {
      if (weekProgrammaticScrollRef.current) return;
      const weekOffset = weekOffsets[index];
      if (weekOffset === undefined) return;
      setCurrentWeekIndex(index);
    },
    [weekOffsets]
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
        params: { date: dateKey, ...(staffFilterId ? { staffId: staffFilterId } : {}) },
      });
    },
    [router, staffFilterId]
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

  const menuWidth = 190;
  const staffMenuWidth = 200;

  const openModeMenu = React.useCallback(() => {
    if (showModeMenu) {
      setShowModeMenu(false);
      return;
    }
    modeButtonRef.current?.measureInWindow((bx, by, bw, bh) => {
      containerRef.current?.measureInWindow((cx, cy, cw) => {
        setModeMenuPos({
          top: by - cy + bh + 8,
          right: Math.max(12, cx + cw - (bx + bw)),
        });
        setShowModeMenu(true);
      });
    });
  }, [showModeMenu]);

  const openStaffMenu = React.useCallback(() => {
    if (showStaffMenu) {
      setShowStaffMenu(false);
      return;
    }
    staffChipRef.current?.measureInWindow((bx, by, bw, bh) => {
      containerRef.current?.measureInWindow((cx, cy, cw) => {
        const maxLeft = Math.max(12, cw - staffMenuWidth - 12);
        setStaffMenuPos({
          top: by - cy + bh + 8,
          left: Math.min(Math.max(12, bx - cx), maxLeft),
        });
        setShowStaffMenu(true);
      });
    });
  }, [showStaffMenu]);

  const showNoCompanyState = !locationLoading && !companyId;
  const showNoLocationState = !locationLoading && !!companyId && !locationId;

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
                <Pressable style={styles.monthRow} onPress={goToToday} hitSlop={8}>
                  <Text style={styles.monthText} numberOfLines={1}>
                    {activeMonthLabel}
                  </Text>
                  <AppIcon name="arrowDown" size={18} color={theme.muted} />
                </Pressable>

                <Pressable ref={staffChipRef} collapsable={false} accessibilityLabel={selectedStaffName} style={[styles.employeeChip, compactHeader && styles.employeeChipCompact]} onPress={openStaffMenu}>
                  <StaffAvatar imagePath={selectedStaff?.image_path} name={selectedStaffName} size={22} fontSize={9} />
                  {!compactHeader && <Text style={styles.employeeName} numberOfLines={1}>
                    {selectedStaffName}
                  </Text>}
                  {!compactHeader && <AppIcon name="expandMore" size={16} color={theme.muted} />}
                </Pressable>

                <View style={styles.headerIcons}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => router.push({ pathname: '/appointment-new', params: { date: todayKey } })}>
                    <AppIcon name="add" size={20} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity ref={modeButtonRef} style={styles.iconButton} onPress={openModeMenu}>
                    <AppIcon name="viewAgenda" size={18} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <SalonSelector />

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText} numberOfLines={2}>
                    {error}
                  </Text>
                  <Pressable onPress={handleRefresh}>
                    <Text style={styles.errorBannerRetry}>{t('calendar.retry')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.calendarArea} onLayout={({ nativeEvent: { layout } }) => {
              setCalendarAreaHeight(layout.height);
              setGridWidth(layout.width);
            }}>
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

              {viewMode === 'week' ? (
                <FlatList
                  ref={weekListRef}
                  data={weekOffsets}
                  keyExtractor={(item) => `week-${item}`}
                  horizontal
                  pagingEnabled
                  initialScrollIndex={WEEK_CENTER_INDEX}
                  showsHorizontalScrollIndicator={false}
                  style={styles.weekPager}
                  getItemLayout={(_, index) => ({ length: gridWidth, offset: gridWidth * index, index })}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / gridWidth);
                    handleWeekChange(index);
                  }}
                  renderItem={({ item }) => {
                    const weekDays = fetchWeekData(item);
                    const weekNeedsSkeleton = weekDays.some((day) => {
                      const [year, month] = day.dateKey.split('-').map(Number);
                      const { key } = monthKeyForOffset(getOffsetForDate(new Date(year, month - 1, 1)));
                      return !monthDataRef.current.has(key) && (loadingMonthKeys.has(key) || locationLoading);
                    });
                    return (
                      <View style={[styles.weekAgendaPage, { width: gridWidth, height: calendarHeight }]}>
                        {weekNeedsSkeleton ? (
                          <WeekAgendaSkeleton styles={styles} rowHeight={weekRowFixedHeight} />
                        ) : (
                        weekDays.map((day) => (
                          <View key={day.dateKey} style={[styles.weekAgendaDay, { height: weekRowFixedHeight }]}>
                            <Pressable
                              style={styles.weekAgendaDateCol}
                              onPress={() => openDaySheet(day.dateKey)}>
                              <Text style={[styles.weekAgendaDate, day.isSunday && styles.dayNumberSunday]}>{day.date}</Text>
                              <Text style={styles.weekAgendaWeekday}>{day.weekday}</Text>
                            </Pressable>
                            {day.appointments.length === 0 ? (
                              <View style={styles.weekAgendaEmpty}>
                                <EmptyState compact title={t('calendar.noAppointmentsToday')} />
                              </View>
                            ) : (
                            <ScrollView style={styles.weekAgendaEvents} nestedScrollEnabled directionalLockEnabled showsVerticalScrollIndicator>
                              {day.appointments.map((event) => {
                                return (
                                  <Pressable
                                    key={event.id}
                                    style={styles.weekAgendaEventRow}
                                    onPress={() =>
                                      router.push({ pathname: '/appointment/[id]', params: { id: event.appointmentId } })
                                    }>
                                    <View style={[styles.weekAgendaColorBar, { backgroundColor: event.color }]} />
                                    <Text style={styles.weekAgendaTime}>{event.startTime}</Text>
                                    <Text style={styles.weekAgendaTitle} numberOfLines={1}>
                                      {event.label}
                                    </Text>
                                    <StaffAvatar
                                      imagePath={staffImageById.get(event.staffId ?? '')}
                                      name={event.staffName}
                                      size={18}
                                      fontSize={8}
                                    />
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                            )}
                          </View>
                        ))
                        )}
                      </View>
                    );
                  }}
                />
              ) : null}

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
              <Pressable style={styles.menuOverlay} onPress={() => setShowModeMenu(false)} />
              <View style={[styles.modeMenu, { top: modeMenuPos.top, right: modeMenuPos.right, width: menuWidth }]}>
                <Pressable
                  style={styles.modeItemActive}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setViewMode('month');
                    setShowModeMenu(false);
                  }}>
                  <AppIcon name="calendar" size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t('calendar.month')}</Text>
                  {viewMode === 'month' ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                </Pressable>
                <Pressable
                  style={styles.modeItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setViewMode('week');
                    setShowModeMenu(false);
                  }}>
                  <AppIcon name="viewWeek" size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t('calendar.week')}</Text>
                  {viewMode === 'week' ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                </Pressable>
                <Pressable
                  style={styles.modeItem}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setViewMode('list');
                    setShowModeMenu(false);
                  }}>
                  <AppIcon name="viewList" size={20} color={theme.text} />
                  <Text style={styles.modeText}>{t('calendar.list')}</Text>
                  {viewMode === 'list' ? <AppIcon name="check" size={20} color={theme.tint} /> : null}
                </Pressable>
              </View>
            </>
          ) : null}

          {showStaffMenu ? (
            <>
              <Pressable style={styles.menuOverlay} onPress={() => setShowStaffMenu(false)} />
              <View style={[styles.staffMenu, { top: staffMenuPos.top, left: staffMenuPos.left, width: staffMenuWidth }]}>
                <ScrollView>
                  <Pressable
                    style={styles.staffMenuItem}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setStaffFilterId(null);
                      setShowStaffMenu(false);
                    }}>
                    <View style={styles.staffMenuAvatar}>
                      <AppIcon name="groups" size={14} color={theme.muted} />
                    </View>
                    <Text style={styles.staffMenuName}>{t('calendar.allStaff')}</Text>
                    {staffFilterId === null ? <AppIcon name="check" size={18} color={theme.tint} /> : null}
                  </Pressable>
                  {staffList.map((staff) => {
                    const name = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || t('calendar.employee');
                    return (
                      <Pressable
                        key={staff.id}
                        style={styles.staffMenuItem}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setStaffFilterId(staff.id);
                          setShowStaffMenu(false);
                        }}>
                        <StaffAvatar imagePath={staff.image_path} name={name} size={22} fontSize={9} />
                        <Text style={styles.staffMenuName}>{name}</Text>
                        {staffFilterId === staff.id ? <AppIcon name="check" size={18} color={theme.tint} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          ) : null}
        </View>
      )}
    </>
    </TabScreen>
  );
}
