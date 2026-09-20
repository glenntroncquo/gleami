import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Pulsing placeholder block for skeleton loading states. */
export function SkeletonBlock({ style }: { style: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.45);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  React.useEffect(() => {
    if (reduceMotion) {
      opacity.set(0.45);
      return;
    }
    opacity.set(withRepeat(withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [opacity, reduceMotion]);

  return <Animated.View style={[style, animatedStyle]} />;
}
