import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep native navigation and safe areas, with marketplace's icons and labels.
export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { hasPermission } = useAuth();
  const canSeeCalendar = hasPermission('calendar:manage');
  const canSeeClients = hasPermission('clients:manage');

  return (
    <NativeTabs
      tintColor={theme.tabIconSelected}
      iconColor={{ default: theme.tabIconDefault, selected: theme.tabIconSelected }}
      labelStyle={{
        default: { fontSize: 11, fontWeight: '600', color: theme.text },
        selected: { fontSize: 11, fontWeight: '600', color: theme.tabIconSelected },
      }}
      backgroundColor={theme.background}
      blurEffect={colorScheme === 'dark' ? 'none' : 'systemChromeMaterialLight'}
      disableTransparentOnScrollEdge
      labelVisibilityMode="labeled"
      indicatorColor={theme.blueTint}>
      {canSeeCalendar ? <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="calendar-outline" />}
        />
        <NativeTabs.Trigger.Label>{t('tabs.calendar')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger> : null}
      {canSeeClients ? <NativeTabs.Trigger name="list" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="people-outline" />}
        />
        <NativeTabs.Trigger.Label>{t('tabs.clients')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger> : null}
      <NativeTabs.Trigger name="more" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="grid-outline" />}
        />
        <NativeTabs.Trigger.Label>{t('tabs.more')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
