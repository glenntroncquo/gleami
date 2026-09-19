import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, { FadeIn, FadeOut, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Native glass on supported iOS builds, with a readable fallback elsewhere. */
export function CalendarGlass({ children, style, ...props }: ViewProps) {
  const dark = useColorScheme() === 'dark';
  const [reduceTransparency, setReduceTransparency] = React.useState(true);
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
      if (mounted) setReduceTransparency(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const nativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  if (nativeGlass && !reduceTransparency) {
    return <GlassView {...props} glassEffectStyle="regular" colorScheme={dark ? 'dark' : 'light'} style={style}>{children}</GlassView>;
  }
  return (
    <View {...props} style={[style, { overflow: 'hidden', backgroundColor: dark ? '#242426' : '#f8f8fa' }]}>
      {!reduceTransparency && Platform.OS === 'ios' && <BlurView pointerEvents="none" tint={dark ? 'systemMaterialDark' : 'systemMaterialLight'} intensity={80} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );
}

/** Keep the glass and its contents together during the anchored spring transition. */
export function CalendarGlassMenu({ children, style, originX, ...props }: ViewProps & { originX: number }) {
  const reducedMotion = useReducedMotion();
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
      style={[style, { transformOrigin: [originX, 0, 0] }]}>
      <CalendarGlass style={{ borderRadius: 28, padding: 8, maxHeight: '100%' }}>{children}</CalendarGlass>
    </Animated.View>
  );
}
