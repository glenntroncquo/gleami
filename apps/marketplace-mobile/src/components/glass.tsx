import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT = '#9f1239';
const INK = '#1c1917';
const MUTED = '#78716c';

let reduceTransparencyValue = false;
const listeners = new Set<(value: boolean) => void>();

const readReduceTransparency = AccessibilityInfo.isReduceTransparencyEnabled;
if (typeof readReduceTransparency === 'function') {
  void readReduceTransparency()
    .then((value) => {
      reduceTransparencyValue = value;
      listeners.forEach((listener) => listener(value));
    })
    .catch(() => undefined);
}
if (typeof AccessibilityInfo.addEventListener === 'function') {
  try {
    AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
      reduceTransparencyValue = value;
      listeners.forEach((listener) => listener(value));
    });
  } catch {
    // Web has no reduce-transparency event.
  }
}

function useReduceTransparency(): boolean {
  const [value, setValue] = useState(reduceTransparencyValue);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

function liquidGlass(): boolean {
  try {
    return Platform.OS === 'ios' && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

type SurfaceProps = ViewProps & {
  radius: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

function GlassSurface({ radius, style, children, ...props }: SurfaceProps) {
  const reduceTransparency = useReduceTransparency();
  const native = liquidGlass() && !reduceTransparency;
  const shape = { borderRadius: radius, overflow: 'hidden' as const };

  if (native) {
    return (
      <GlassContainer spacing={12} style={style}>
        <GlassView {...props} glassEffectStyle="regular" colorScheme="light" style={shape}>
          {children}
        </GlassView>
      </GlassContainer>
    );
  }

  return (
    <View
      {...props}
      style={[
        shape,
        styles.fallback,
        reduceTransparency ? styles.solid : null,
        style,
      ]}>
      {reduceTransparency ? null : (
        <BlurView pointerEvents="none" intensity={55} tint="light" style={StyleSheet.absoluteFill} />
      )}
      {children}
    </View>
  );
}

export function GlassCard({ children, style, ...props }: ViewProps) {
  return (
    <GlassSurface {...props} radius={20} style={style}>
      <View style={styles.cardInner}>{children}</View>
    </GlassSurface>
  );
}

export function GlassPill({ children, style, ...props }: ViewProps) {
  return (
    <GlassSurface {...props} radius={999} style={style}>
      <View style={styles.pillInner}>{children}</View>
    </GlassSurface>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.tabWrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <GlassSurface radius={28}>
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = options.title ?? route.name;
            const color = focused ? ACCENT : MUTED;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={onPress}
                style={styles.tab}>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </View>
  );
}

export function TabIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: ColorValue; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  solid: {
    backgroundColor: '#f7f6f4',
  },
  cardInner: {
    padding: 16,
  },
  pillInner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  tabRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export const glassColors = { accent: ACCENT, ink: INK, muted: MUTED };
