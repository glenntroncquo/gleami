import React from 'react';
import type { ViewProps } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';
import { LiquidGlass } from '@/components/liquid-glass';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** @deprecated Import `LiquidGlass` from `@/components/liquid-glass` instead — this name predates its use outside the calendar. */
export const CalendarGlass = LiquidGlass;

/** Keep the glass and its contents together during the anchored spring transition. */
export function CalendarGlassMenu({ children, style, originX, ...props }: ViewProps & { originX: number }) {
  const reducedMotion = useReducedMotion();
  const theme = Colors[useColorScheme() ?? 'light'];
  const entering = () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.18 }] },
      animations: { opacity: withTiming(1, { duration: 100 }), transform: [{ scale: withSpring(1, { damping: 24, stiffness: 280, mass: 0.8 }) }] },
    };
  };
  const exiting = () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ scale: 1 }] },
      animations: { opacity: withTiming(0, { duration: 90 }), transform: [{ scale: withTiming(0.96, { duration: 110 }) }] },
    };
  };
  return (
    <Animated.View
      {...props}
      accessibilityViewIsModal
      entering={reducedMotion ? FadeIn.duration(100) : entering}
      exiting={reducedMotion ? FadeOut.duration(100) : exiting}
      // Native glass can miss its first composite during the entrance spring.
      // Keep a solid backing mounted with the content so every frame is readable.
      style={[style, { backgroundColor: theme.background, borderRadius: 28, transformOrigin: [originX, 0, 0] }]}>
      <CalendarGlass style={{ borderRadius: 28, padding: 8, maxHeight: '100%' }}>{children}</CalendarGlass>
    </Animated.View>
  );
}
