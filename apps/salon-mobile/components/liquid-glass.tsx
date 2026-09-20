import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Native glass on supported iOS builds, with a readable fallback elsewhere. */
export function LiquidGlass({ children, style, ...props }: ViewProps) {
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
