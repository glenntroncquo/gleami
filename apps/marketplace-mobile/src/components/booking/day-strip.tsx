import React, { useEffect, useImperativeHandle, useRef } from 'react';
import { Pressable, ScrollView, Text, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { SkeletonBlock } from '@/src/components/skeleton';
import { dayOfMonth, longDateLabel, monthLabel, weekdayLabel } from '@/src/lib/booking-date';
import { brandColors } from '@/src/theme/colors';

const CHIP_WIDTH = 62;
const CHIP_HEIGHT = 92;
const GAP = 8;
const STEP = CHIP_WIDTH + GAP;
const EDGE = 20;
/** Long enough that a flick settles before we ask for slots, short enough to feel answered. */
const SETTLE_MS = 200;

export type DayStripHandle = {
  scrollToDay: (key: string, animated?: boolean) => void;
};

/**
 * The whole booking horizon on one scrollable rail. Slots are fetched per 28-day
 * window, so the strip reports the leading day once scrolling settles and the
 * screen subscribes to the windows that covers.
 */
export function DayStrip({
  ref,
  dayKeys,
  openKeys,
  settledWindows,
  windowDays,
  selected,
  onSelect,
  onSettle,
  onMonthChange,
}: {
  ref?: React.Ref<DayStripHandle>;
  dayKeys: string[];
  /** Day keys with at least one free slot; only meaningful inside a settled window. */
  openKeys: Set<string>;
  /** Windows whose request finished; days outside them still show a skeleton. */
  settledWindows: Set<number>;
  windowDays: number;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Leading visible day, once the user stops scrolling. */
  onSettle: (index: number) => void;
  onMonthChange: (key: string) => void;
}) {
  const listRef = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const month = useRef(dayKeys[0]?.slice(0, 7) ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToDay: (key, animated = false) => {
        const index = dayKeys.indexOf(key);
        if (index < 0) return;
        const centered = EDGE + index * STEP - (viewport.current - CHIP_WIDTH) / 2;
        listRef.current?.scrollTo({ x: Math.max(0, centered), animated });
        // Reported here rather than left to onScroll, which a programmatic
        // jump is not guaranteed to fire.
        if (key.slice(0, 7) !== month.current) {
          month.current = key.slice(0, 7);
          onMonthChange(key);
        }
      },
    }),
    [dayKeys, onMonthChange],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(
      dayKeys.length - 1,
      Math.max(0, Math.floor(event.nativeEvent.contentOffset.x / STEP)),
    );
    const key = dayKeys[index];
    if (key && key.slice(0, 7) !== month.current) {
      month.current = key.slice(0, 7);
      onMonthChange(key);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSettle(index), SETTLE_MS);
  };

  return (
    <ScrollView
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onLayout={(event) => {
        viewport.current = event.nativeEvent.layout.width;
      }}
      contentContainerStyle={{ paddingHorizontal: EDGE, paddingBottom: 22, gap: GAP }}>
      {dayKeys.map((key, index) =>
        settledWindows.has(Math.floor(index / windowDays)) ? (
          <DayChip
            key={key}
            dayKey={key}
            open={openKeys.has(key)}
            selected={selected === key}
            onSelect={onSelect}
          />
        ) : (
          <SkeletonBlock key={key} style={{ width: CHIP_WIDTH, height: CHIP_HEIGHT, borderRadius: 16 }} />
        ),
      )}
    </ScrollView>
  );
}

const DayChip = React.memo(function DayChip({
  dayKey,
  open,
  selected,
  onSelect,
}: {
  dayKey: string;
  open: boolean;
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <Pressable
      disabled={!open}
      onPress={() => onSelect(dayKey)}
      accessibilityRole="button"
      accessibilityLabel={longDateLabel(dayKey)}
      accessibilityState={{ selected, disabled: !open }}
      style={({ pressed }) => ({
        width: CHIP_WIDTH,
        height: CHIP_HEIGHT,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? brandColors.lavender : brandColors.line,
        backgroundColor: selected ? brandColors.lavender : '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        opacity: pressed ? 0.7 : open ? 1 : 0.35,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Text style={{ color: selected ? '#ffffff' : brandColors.muted, fontSize: 12 }}>{weekdayLabel(dayKey)}</Text>
      <Text style={{ color: selected ? '#ffffff' : brandColors.navy, fontSize: 22, fontWeight: '600' }}>
        {dayOfMonth(dayKey)}
      </Text>
      <Text style={{ color: selected ? '#ffffff' : brandColors.muted, fontSize: 12 }}>
        {monthLabel(dayKey).split(' ')[0]!.slice(0, 3)}
      </Text>
    </Pressable>
  );
});
