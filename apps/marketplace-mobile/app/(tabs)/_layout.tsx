import { Tabs } from 'expo-router';

import { GlassTabBar, TabIcon } from '@/src/components/glass';
import { t } from '@/src/i18n';

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#ffffff' } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="(discovery)" options={{ title: 'Zoeken', tabBarIcon: ({ color, size }) => <TabIcon name="search-outline" color={color} size={size} /> }} />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, size }) => <TabIcon name="heart-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
