import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Checked once at module load and shared, not per-mount. The glass menus
 * (staff/mode/month pickers) mount fresh every time they open — if each
 * mount re-ran the async accessibility check with a guessed default, the
 * first frame would render the opaque fallback View, then swap to the real
 * GlassView mid-entrance-animation. That type swap during the spring is
 * what made menus intermittently render as a blank transparent blob.
 */
let reduceTransparencyValue = false;
const reduceTransparencyListeners = new Set<(value: boolean) => void>();
AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
  reduceTransparencyValue = value;
  reduceTransparencyListeners.forEach((listener) => listener(value));
});
AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
  reduceTransparencyValue = value;
  reduceTransparencyListeners.forEach((listener) => listener(value));
});

function useReduceTransparency() {
  const [value, setValue] = React.useState(reduceTransparencyValue);
  React.useEffect(() => {
    reduceTransparencyListeners.add(setValue);
    return () => { reduceTransparencyListeners.delete(setValue); };
  }, []);
  return value;
}

/** Native glass on supported iOS builds, with a readable fallback elsewhere. */
export function LiquidGlass({ children, style, ...props }: ViewProps) {
  const dark = useColorScheme() === 'dark';
  const reduceTransparency = useReduceTransparency();
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
