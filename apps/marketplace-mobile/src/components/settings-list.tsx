import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LoadingDots } from '@/src/components/loading-dots';
import { brandColors } from '@/src/theme/colors';

/** Rounded card that holds SettingsRow children, separated by hairlines. */
export function SettingsGroup({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <React.Fragment key={index}>
          {index > 0 ? <View style={styles.separator} /> : null}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  destructive,
  busy,
  chevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Second line, e.g. an address or a status. */
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
  chevron?: boolean;
}) {
  const color = destructive ? '#D64545' : brandColors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#EEF0F6' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {busy ? (
        <LoadingDots size={6} color={color} />
      ) : !chevron ? null : (
        <Ionicons name="chevron-forward" size={17} color={brandColors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: 20, borderCurve: 'continuous', backgroundColor: brandColors.surface, overflow: 'hidden' },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  label: { fontSize: 15.5, fontWeight: '500' },
  detail: { marginTop: 2, fontSize: 13, color: brandColors.muted },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 48, backgroundColor: brandColors.line },
});
