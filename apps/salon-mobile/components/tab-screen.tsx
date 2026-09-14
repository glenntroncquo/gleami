import React from 'react';
import { SafeAreaView } from 'react-native-screens/experimental';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Native safe areas include the actual tab bar, not an estimated height. */
export function TabScreen({ children }: { children: React.ReactNode }) {
  const theme = Colors[useColorScheme() ?? 'light'];
  return (
    <SafeAreaView edges={{ top: true, bottom: true, left: true, right: true }}
      style={{ flex: 1, backgroundColor: theme.background }}>
      {children}
    </SafeAreaView>
  );
}
