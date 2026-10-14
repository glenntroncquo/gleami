import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';

import { useTheme } from './use-theme';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: AppIconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'large' | 'medium';
  backgroundColor?: ColorValue;
  textColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'large', backgroundColor, textColor, style }: Props) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.text, fg: theme.background, border: theme.text },
    secondary: { bg: theme.secondary, fg: theme.text, border: theme.border },
    destructive: { bg: theme.errorSurface, fg: theme.destructive, border: theme.errorSurface },
    ghost: { bg: 'transparent', fg: theme.tint, border: 'transparent' },
  }[variant];
  const background = backgroundColor ?? palette.bg;
  const foreground = textColor ?? palette.fg;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        size === 'large' ? styles.large : styles.medium,
        { backgroundColor: background, borderColor: backgroundColor ?? palette.border, opacity: disabled ? 0.4 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size={18} color={foreground} /> : null}
          <Text style={[styles.label, size === 'medium' && styles.labelMedium, { color: foreground }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  large: { height: 52, borderRadius: 28 },
  medium: { height: 40, borderRadius: 20, paddingHorizontal: 16 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 15.5, fontWeight: '600' },
  labelMedium: { fontSize: 14, fontWeight: '600' },
});
