import React, { useEffect } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    let reduceMotion = false;
    let subscription: { remove: () => void } | undefined;
    const start = () => {
      if (reduceMotion) return;
      opacity.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
    };
    const readReduceMotion = AccessibilityInfo.isReduceMotionEnabled;
    if (typeof readReduceMotion === 'function') {
      void readReduceMotion()
        .then((value) => {
          reduceMotion = value;
          if (!value) start();
        })
        .catch(() => start());
    } else {
      start();
    }
    if (typeof AccessibilityInfo.addEventListener === 'function') {
      try {
        subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
          reduceMotion = value;
          if (value) opacity.value = 0.7;
          else start();
        });
      } catch {
        subscription = undefined;
      }
    }
    return () => subscription?.remove();
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View className="bg-line" style={[animated, style]} accessibilityElementsHidden />;
}

/** A text line: a rounded bar vertically centred in the text's line box, so swapping in real text doesn't shift. */
export function SkeletonText({
  lineHeight,
  size,
  width,
  style,
}: {
  lineHeight: number;
  /** Visual cap height of the bar; defaults to ~60% of the line. */
  size?: number;
  width: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  const bar = size ?? Math.round(lineHeight * 0.6);
  return (
    <View style={[{ height: lineHeight, justifyContent: 'center' }, style]}>
      <SkeletonBlock style={{ height: bar, width, borderRadius: bar / 2 }} />
    </View>
  );
}

/** Mirrors the home category grid: 56px tiles, 7px gap, 30px two-line label box. */
export function CategoryGridSkeleton({ columns = 6 }: { columns?: number }) {
  const labelWidths = [38, 46, 30, 50, 42, 34, 48, 36, 44, 40, 32, 46];
  return (
    <View
      style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 26, gap: 8, overflow: 'hidden' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {Array.from({ length: columns }, (_, column) => (
        <View key={column} style={{ gap: 18 }}>
          {[0, 1].map((row) => (
            <View key={row} style={{ width: 70, alignItems: 'center', gap: 7 }}>
              <SkeletonBlock style={{ width: 56, height: 56, borderRadius: 17 }} />
              <View style={{ height: 30, alignItems: 'center' }}>
                <SkeletonText lineHeight={14} size={8} width={labelWidths[(column * 2 + row) % labelWidths.length]} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Mirrors ResultCard `compact` (246 wide on home): photo, name, place, treatment.
 * No rating line: most salons have no reviews yet, so the real card is three lines.
 */
export function CompactCardSkeleton() {
  return (
    <View className="mb-2" style={{ width: 246 }}>
      <SkeletonBlock style={{ height: 148, borderRadius: 20 }} />
      <View className="mt-3">
        <SkeletonText lineHeight={24} size={13} width="72%" />
        <SkeletonText lineHeight={20} size={10} width="46%" style={{ marginTop: 2 }} />
        <SkeletonText lineHeight={20} size={10} width="58%" style={{ marginTop: 2 }} />
      </View>
      <View className="mt-2" />
    </View>
  );
}

export function ResultCardSkeleton() {
  return (
    <View className="mb-8">
      <SkeletonBlock style={{ height: 210, borderRadius: 20 }} />
      <SkeletonBlock style={{ height: 16, width: '62%', marginTop: 12, borderRadius: 8 }} />
      <SkeletonBlock style={{ height: 14, width: '40%', marginTop: 8, borderRadius: 8 }} />
      <SkeletonBlock style={{ height: 22, width: 140, marginTop: 10, borderRadius: 999 }} />
    </View>
  );
}
