import React from 'react';
import { StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { Design } from '@/constants/theme';

import { useTheme } from './use-theme';

/** Small uppercase-free section heading above a group or list. */
export function SectionHeader({ title, action, style }: { title: string; action?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action}
    </View>
  );
}

/** Rounded, bordered container that draws hairline separators between its rows. */
export function ListGroup({ children, style, inset = 68 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; inset?: number }) {
  const theme = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, { borderColor: theme.border, backgroundColor: theme.background }, style]}>
      {rows.map((row, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View style={[styles.separator, { marginLeft: inset, backgroundColor: theme.border }]} /> : null}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Rounded square icon tile used as a row's leading element. */
export function IconTile({ name, tone = 'neutral', size = 40 }: { name: AppIconName; tone?: 'neutral' | 'brand' | 'destructive'; size?: number }) {
  const theme = useTheme();
  const colors = {
    neutral: { bg: theme.surface, fg: theme.text },
    brand: { bg: theme.tint, fg: theme.onTint },
    destructive: { bg: theme.errorSurface, fg: theme.destructive },
  }[tone];
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.bg }]}>
      <AppIcon name={name} size={size * 0.45} color={colors.fg} />
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string | null;
  leading?: React.ReactNode;
  icon?: AppIconName;
  iconTone?: 'neutral' | 'brand' | 'destructive';
  value?: string | null;
  trailing?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

export function ListRow({
  title,
  subtitle,
  leading,
  icon,
  iconTone = 'neutral',
  value,
  trailing,
  onPress,
  chevron = !!onPress,
  destructive,
  selected,
  disabled,
  accessibilityHint,
}: RowProps) {
  const theme = useTheme();
  const content = (
    <>
      {leading ?? (icon ? <IconTile name={icon} tone={destructive ? 'destructive' : iconTone} /> : null)}
      <View style={styles.text}>
        <Text style={[styles.title, { color: destructive ? theme.destructive : theme.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.value, { color: theme.muted }]} numberOfLines={1}>{value}</Text> : null}
      {trailing}
      {selected ? <AppIcon name="check" size={18} color={theme.tint} /> : null}
      {chevron && !selected ? <AppIcon name="chevronRight" size={16} color={theme.muted} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && { opacity: 0.5 }]}>
      {content}
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, icon, value, onValueChange, disabled }: {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      icon={icon}
      trailing={<Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: theme.tint }} accessibilityLabel={title} />}
    />
  );
}

/** Radio-style row for single choice lists (staff, options). */
export function RadioRow({ title, subtitle, leading, selected, onPress }: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={styles.row}>
      {leading}
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, { borderColor: selected ? theme.tint : theme.border }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.tint }]} /> : null}
      </View>
    </Pressable>
  );
}

/** Label/value pair for detail screens, rendered inside a ListGroup. */
export function DetailRow({ label, value, onPress }: { label: string; value?: string | null; onPress?: () => void }) {
  const theme = useTheme();
  const body = (
    <>
      <Text style={[styles.detailLabel, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: onPress ? theme.tint : theme.text }]} numberOfLines={2}>{value || '—'}</Text>
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.detailRow}>{body}</Pressable>
  ) : (
    <View style={styles.detailRow}>{body}</View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  group: { borderWidth: 1, borderRadius: Design.cardRadius - 4, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth },
  tile: { alignItems: 'center', justifyContent: 'center' },
  // The shared Pressable defaults to justifyContent: 'center', which would centre row content.
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 14, paddingHorizontal: 14, paddingVertical: 10 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 13 },
  value: { fontSize: 15, maxWidth: '45%' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingHorizontal: 14, minHeight: 50, paddingVertical: 12 },
  detailLabel: { fontSize: 15 },
  detailValue: { flexShrink: 1, fontSize: 15, fontWeight: '500', textAlign: 'right' },
});
