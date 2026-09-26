import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SearchItem } from '@/src/api/types';
import { ResultCard } from '@/src/components/result-card';
import { SearchBar } from '@/src/components/expandable-search';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { useCategories, useSearchResults } from '@/src/hooks/use-marketplace';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

function categoryIcon(name: string): keyof typeof Ionicons.glyphMap {
  if (/haar|kapper|keratine/i.test(name)) return 'cut-outline';
  if (/nagel|make-up/i.test(name)) return 'color-palette-outline';
  if (/massage|spa/i.test(name)) return 'leaf-outline';
  if (/wenkbrauw|wimper/i.test(name)) return 'eye-outline';
  if (/gezicht/i.test(name)) return 'happy-outline';
  if (/ontharing/i.test(name)) return 'sparkles-outline';
  return 'flower-outline';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const categories = useCategories();
  const search = useSearchResults();
  const online = useOnline();
  const setCategory = useDiscovery((s) => s.setCategory);
  const setQuery = useDiscovery((s) => s.setQuery);
  const userLocation = useDiscovery((s) => s.userLocation);
  const items = search.data?.pages.flatMap((page) => page.items) ?? [];
  const choices = [{ id: null, name: 'Alle', icon: 'grid-outline' as const }, ...(categories.data ?? []).map((c) => ({ ...c, icon: categoryIcon(c.name) }))];
  const columns = Array.from({ length: Math.ceil(choices.length / 2) }, (_, i) => choices.slice(i * 2, i * 2 + 2));
  const browse = (id: string | null) => { setQuery(''); setCategory(id); router.navigate('/discover'); };
  return <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 104 }} refreshControl={<RefreshControl refreshing={search.isRefetching} onRefresh={() => { void search.refetch(); }} tintColor={brandColors.navy} />}>
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Zoekgebied wijzigen op de kaart" onPress={() => router.navigate('/discover')} className="min-h-11 flex-row items-center gap-1">
          <Ionicons name="location" size={15} color={brandColors.blue} /><Text className="text-xs font-semibold text-ink">{userLocation ? 'Huidige locatie' : 'Brussel'}</Text><Ionicons name="chevron-down" size={12} color="#071D43" />
        </Pressable>
        <Image source={require('@/assets/gleami-wordmark.svg')} contentFit="contain" accessibilityLabel="Gleami" style={{ width: 96, height: 36 }} />
      </View>
      <SearchBar variant="home" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 26, gap: 8 }}>
        {columns.map((column, i) => <View key={i} style={{ gap: 18 }}>{column.map((c) => <Pressable key={c.id ?? 'all'} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => browse(c.id)} style={{ width: 70, alignItems: 'center', gap: 7 }}>
          <View style={{ width: 56, height: 56, borderRadius: 17, borderWidth: 1, borderColor: c.id ? brandColors.line : `${brandColors.blue}40`, backgroundColor: c.id ? brandColors.surface : brandColors.blueTint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={c.icon} size={25} color={c.id ? '#071D43' : brandColors.navy} /></View>
          <Text numberOfLines={2} style={{ height: 30, fontSize: 10, lineHeight: 14, textAlign: 'center', color: '#071D43' }}>{c.name}</Text>
        </Pressable>)}</View>)}
      </ScrollView>
      {categories.isError ? <Pressable accessibilityRole="button" onPress={() => categories.refetch()} className="px-5 py-3"><Text className="text-accent">Categorieën opnieuw laden</Text></Pressable> : null}
      {!online && !items.length ? <OfflineState onRetry={() => search.refetch()} /> : search.isLoading ? <ActivityIndicator style={{ margin: 40 }} color={brandColors.navy} /> : search.isError && !items.length ? <ErrorState onRetry={() => search.refetch()} /> : items.length ? <>
        <SalonRow title="Ontdek jouw volgende salon" items={items.slice(0, 10)} />
        <SalonRow title="Dicht bij jou" items={[...items].filter((item) => item.distanceKm != null).sort((a, b) => a.distanceKm! - b.distanceKm!).slice(0, 10)} />
      </> : <View className="p-6"><Text className="text-xl font-semibold text-ink">Geen salons gevonden</Text><Pressable accessibilityRole="button" onPress={() => browse(null)} className="py-4"><Text className="text-accent">Bekijk alle behandelingen</Text></Pressable></View>}
    </ScrollView>
  </View>;
}

function SalonRow({ title, items }: { title: string; items: SearchItem[] }) {
  if (!items.length) return null;
  return <View className="mb-4 mt-4">
    <View className="mb-3 flex-row items-center justify-between gap-2 px-5"><Text className="flex-1 text-xl font-bold tracking-tight text-ink">{title}</Text><Pressable onPress={() => router.navigate('/discover')} accessibilityRole="button" accessibilityLabel={`Bekijk alle salons: ${title}`} className="h-11 w-11 items-center justify-center rounded-full border border-line"><Ionicons name="arrow-forward" size={19} color="#071D43" /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>{items.map((item) => <View key={item.locationId} style={{ width: 246 }}><ResultCard item={item} availabilityLoading={false} compact /></View>)}</ScrollView>
  </View>;
}
