import React, { useEffect } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    let reduceMotion = false;
    let subscription: { remove: () => void } | undefined;
    const start = () => {
      if (reduceMotion) return;
      opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
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
