import React from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { SkeletonBlock } from '@/components/skeleton-block';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function useBoneColor() {
  return Colors[useColorScheme() ?? 'light'].border;
}

function Bone({
  color,
  width,
  height,
  radius = 4,
  style,
}: {
  color: string;
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <SkeletonBlock style={[{ width, height, borderRadius: radius, backgroundColor: color }, style]} />;
}

/** Avatar plus two text lines. Matches client, staff, service, and picker lists. */
export function RowListSkeleton({
  count = 8,
  avatar = true,
  style,
}: {
  count?: number;
  avatar?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color = useBoneColor();
  return (
    <View style={[{ paddingHorizontal: 16, paddingTop: 8 }, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          {avatar ? <Bone color={color} width={40} height={40} radius={20} /> : null}
          <View style={{ flex: 1, gap: 8 }}>
            <Bone color={color} width={`${52 - (index % 3) * 8}%`} height={14} />
            <Bone color={color} width={`${34 - (index % 4) * 4}%`} height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Title, a few detail lines, then a short list. Matches appointment, client, and order screens. */
export function DetailSkeleton() {
  const color = useBoneColor();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 22 }}>
      <Bone color={color} width="58%" height={22} radius={6} />
      <View style={{ gap: 14 }}>
        <Bone color={color} width="42%" height={14} />
        <Bone color={color} width="36%" height={14} />
        <Bone color={color} width="48%" height={14} />
      </View>
      <RowListSkeleton count={4} style={{ paddingHorizontal: 0, paddingTop: 4 }} />
    </View>
  );
}

/** Stacked label and field blocks. Matches settings and edit screens. */
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  const color = useBoneColor();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 18 }}>
      {Array.from({ length: fields }, (_, index) => (
        <View key={index} style={{ gap: 8 }}>
          <Bone color={color} width={72 + (index % 3) * 24} height={12} />
          <Bone color={color} width="100%" height={44} radius={12} />
        </View>
      ))}
    </View>
  );
}

/** Three summary cards with a bar chart, matching the dashboard. */
export function DashboardSkeleton() {
  const color = useBoneColor();
  return (
    <View style={{ padding: 16, gap: 20 }}>
      {Array.from({ length: 3 }, (_, card) => (
        <View key={card} style={{ borderWidth: 1, borderColor: color, borderRadius: 16, padding: 16, gap: 12 }}>
          <Bone color={color} width={90} height={12} />
          <Bone color={color} width={140} height={28} radius={6} />
          <Bone color={color} width={110} height={11} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 96, marginTop: 8 }}>
            {Array.from({ length: 6 }, (__, bar) => (
              <Bone key={bar} color={color} width={18} height={28 + ((bar + card) % 5) * 12} radius={4} style={{ flex: 1 }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Hour gutter and a few appointment blocks, matching the day and week time grid. */
export function TimeGridSkeleton() {
  const color = useBoneColor();
  return (
    <View style={{ flex: 1, flexDirection: 'row', paddingTop: 8 }}>
      <View style={{ width: 48, gap: 28, paddingTop: 8 }}>
        {Array.from({ length: 8 }, (_, index) => (
          <Bone key={index} color={color} width={32} height={10} style={{ marginLeft: 8 }} />
        ))}
      </View>
      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: color, paddingHorizontal: 10, gap: 16, paddingTop: 24 }}>
        <Bone color={color} width="70%" height={52} radius={8} />
        <Bone color={color} width="55%" height={36} radius={8} style={{ marginTop: 12 }} />
        <Bone color={color} width="80%" height={64} radius={8} style={{ marginTop: 28 }} />
      </View>
    </View>
  );
}
