import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'discover' };

export default function DiscoveryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#ffffff' } }}>
      <Stack.Screen name="discover" />
      <Stack.Screen name="search" />
    </Stack>
  );
}
