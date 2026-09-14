import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getCompanyImageUrl } from '@/lib/storage';
import { getInitialsFromLabel } from '@/lib/text';

type Props = {
  imagePath: string | null | undefined;
  name: string;
  size: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

/** Staff avatar: real photo when `imagePath` resolves, else a centered initials circle. */
export function StaffAvatar({ imagePath, name, size, backgroundColor, textColor, fontSize }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);
  const uri = getCompanyImageUrl(imagePath ?? null);
  const circleSize = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, circleSize]} contentFit="cover" />;
  }

  return (
    <View style={[styles.circle, circleSize, { backgroundColor: backgroundColor ?? theme.surface }]}>
      <Text style={{ fontSize: fontSize ?? Math.max(9, Math.round(size * 0.4)), fontWeight: '700', color: textColor ?? theme.muted }}>
        {getInitialsFromLabel(name)}
      </Text>
    </View>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    image: {
      backgroundColor: theme.border,
    },
    circle: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
