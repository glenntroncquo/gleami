import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { brandColors } from '@/src/theme/colors';
import { t } from '@/src/i18n';

const PILL_TIMING = { duration: 260, easing: Easing.bezier(0.25, 1, 0.5, 1) };
const OVERVIEW_WIDTH = 52;

/**
 * Category chips with a navy pill that slides to the active chip, and a pinned
 * overview button that opens the full category list when the row overflows.
 */
export function CategoryChipRow({
  categories,
  selected,
  onSelect,
  onOverview,
}: {
  categories: { id: string; name: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onOverview: () => void;
}) {
  const listRef = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const [frames, setFrames] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);
  const frame = frames[selected];

  useEffect(() => {
    if (!frame) return;
    if (placed.current) {
      x.value = withTiming(frame.x, PILL_TIMING);
      width.value = withTiming(frame.width, PILL_TIMING);
    } else {
      x.value = frame.x;
      width.value = frame.width;
      placed.current = true;
    }
    const centered = frame.x - (viewport.current - OVERVIEW_WIDTH - frame.width) / 2;
    listRef.current?.scrollTo({ x: Math.max(0, centered), animated: true });
  }, [frame, width, x]);

  const pillStyle = useAnimatedStyle(() => ({
    width: width.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View>
      <ScrollView
        ref={listRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(event) => {
          viewport.current = event.nativeEvent.layout.width;
        }}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 + OVERVIEW_WIDTH, gap: 8 }}>
        <Animated.View
          pointerEvents="none"
          className="absolute left-0 top-0 h-10 rounded-full bg-ink"
          style={[{ opacity: frame ? 1 : 0 }, pillStyle]}
        />
        {categories.map((category) => {
          const active = category.id === selected;
          return (
            <Pressable
              key={category.id}
              onPress={() => onSelect(category.id)}
              onLayout={(event) => {
                const { x: left, width: w } = event.nativeEvent.layout;
                setFrames((current) =>
                  current[category.id]?.x === left && current[category.id]?.width === w
                    ? current
                    : { ...current, [category.id]: { x: left, width: w } },
                );
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={
                active
                  ? 'h-10 justify-center rounded-full border border-transparent px-4'
                  : 'h-10 justify-center rounded-full border border-line px-4'
              }>
              <Text
                className={active ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-ink'}>
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Pinned over the row's right edge, on an opaque strip so chips never
          peek out beside the button. */}
      <View className="absolute right-0 top-0 h-10 flex-row items-center" pointerEvents="box-none">
        <View
          pointerEvents="none"
          style={{
            width: 24,
            height: 40,
            experimental_backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)',
          }}
        />
        <View className="h-10 flex-row items-center bg-canvas pr-5">
          <Pressable
            onPress={onOverview}
            accessibilityRole="button"
            accessibilityLabel={t('booking.allCategories')}
            className="h-10 w-10 items-center justify-center rounded-full bg-canvas active:opacity-60"
            style={{ boxShadow: '0 1px 6px rgba(7,29,67,0.14)' }}>
            <Ionicons name="list" size={19} color={brandColors.navy} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
