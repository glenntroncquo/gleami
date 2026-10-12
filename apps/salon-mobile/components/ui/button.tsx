import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'large', style }: Props) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.tint, fg: theme.onTint, border: theme.tint },
    secondary: { bg: theme.background, fg: theme.text, border: theme.border },
    destructive: { bg: theme.errorSurface, fg: theme.destructive, border: theme.errorSurface },
    ghost: { bg: 'transparent', fg: theme.tint, border: 'transparent' },
  }[variant];
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
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.4 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <AppIcon name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[styles.label, size === 'medium' && styles.labelMedium, { color: palette.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  large: { height: 52, borderRadius: 26 },
  medium: { height: 40, borderRadius: 20, paddingHorizontal: 16 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 16, fontWeight: '700' },
  labelMedium: { fontSize: 14, fontWeight: '600' },
});
