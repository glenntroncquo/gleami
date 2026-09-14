import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Real OS-rendered tab bar (UITabBarController on iOS, Material Tabs on
// Android) instead of a JS-drawn approximation — on iOS 26 the system draws
// this with actual Liquid Glass (refraction, specular highlight, the native
// press bounce) automatically; none of that can be faked with a BlurView.
// Trade-off: NativeTabs can't intercept a tab press for custom logic, so
// "tap the active Calendar tab to jump to today" and the long-press
// month/week/list menu both moved to buttons in the calendar header instead.
//
// `<NativeTabs.Trigger.Label hidden />` (no children) is required, not just
// omitted: expo-router falls back to the raw route name ("index" / "list" /
// "more") as the title whenever no Label is present, and that literal string
// then shows up in the tab bar. `hidden` sets title to '', which
// react-native-screens nils out on the native side — same as no title at all,
// but without the route-name leak.
export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <NativeTabs
      tintColor={theme.tint}
      backgroundColor={theme.background}
      blurEffect={colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge
      labelVisibilityMode="unlabeled"
      disableIndicator>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf="calendar"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="calendar-today" />}
        />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="list" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf="person.2"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="people-outline" />}
        />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          sf="square.grid.2x2"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="grid-view" />}
        />
        <NativeTabs.Trigger.Label hidden />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
