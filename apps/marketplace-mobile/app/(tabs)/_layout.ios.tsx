import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

/** System material supplies Liquid Glass on iOS 26 and native blur on older iOS. */
export default function TabLayout() {
  return (
    <NativeTabs
      tintColor={brandColors.blue}
      iconColor={{ default: brandColors.navy, selected: brandColors.blue }}
      labelStyle={{ default: { color: brandColors.navy }, selected: { color: brandColors.navy, fontWeight: '600' } }}
      disableTransparentOnScrollEdge
      minimizeBehavior="never">
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(discovery)" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" />
        <NativeTabs.Trigger.Label>Zoeken</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf="calendar" />
        <NativeTabs.Trigger.Label>{t('tabs.bookings')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.favorites')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
