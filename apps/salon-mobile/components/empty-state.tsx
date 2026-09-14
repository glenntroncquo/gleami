import { Pressable } from '@/components/pressable-scale';
import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type EmptyStateProps = {
  icon?: AppIconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Tighter, left-aligned layout for inline sections and week-day slots. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared branded empty state — icon well, title, short subtitle, optional CTA.
 * Full variant fills its parent and centers (list screens). Compact sits inline.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);
  const showAction = Boolean(actionLabel && onAction);

  return (
    <View
      style={[compact ? styles.compact : styles.full, style]}
      accessibilityRole="summary"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      {icon ? (
        compact ? (
          <AppIcon name={icon} size={18} color={theme.muted} />
        ) : (
          <View style={styles.iconWell}>
            <AppIcon name={icon} size={28} color={theme.muted} />
          </View>
        )
      ) : null}
      <Text style={compact ? styles.compactTitle : styles.title}>{title}</Text>
      {subtitle ? <Text style={compact ? styles.compactSubtitle : styles.subtitle}>{subtitle}</Text> : null}
      {showAction ? (
        <Pressable
          style={compact ? styles.compactAction : styles.action}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}>
          <Text style={compact ? styles.compactActionText : styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    full: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 40,
      gap: 10,
    },
    iconWell: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      marginBottom: 6,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: -0.24,
      color: theme.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted,
      textAlign: 'center',
      maxWidth: 280,
    },
    action: {
      marginTop: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.text,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    compact: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingVertical: 6,
      gap: 4,
    },
    compactTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.muted,
    },
    compactSubtitle: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.muted,
    },
    compactAction: {
      marginTop: 4,
    },
    compactActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
  });
