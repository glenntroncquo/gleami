import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GHENT, mapboxToken } from '@/src/config';
import { labelForCoordinates, useDiscovery } from '@/src/store/discovery';
import { brandColors } from '@/src/theme/colors';

type Suggestion = { mapbox_id: string; name: string; place_formatted?: string; full_address?: string };
type SuggestResponse = { suggestions?: Suggestion[] };
type RetrieveResponse = { features?: { geometry?: { coordinates?: [number, number] }; properties?: { name?: string; place_formatted?: string; full_address?: string } }[] };

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const center = useDiscovery((s) => s.center);
  const setSearchLocation = useDiscovery((s) => s.setSearchLocation);
  const setUserLocation = useDiscovery((s) => s.setUserLocation);
  const savedLabel = useDiscovery((s) => s.locationLabel);
  const [text, setText] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const sessionToken = useRef(Crypto.randomUUID());
  const requestId = useRef(0);

  useEffect(() => {
    const query = text.trim();
    const id = ++requestId.current;
    if (query.length < 2 || !mapboxToken) return;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams({ q: query, access_token: mapboxToken, session_token: sessionToken.current, country: 'BE', language: 'nl,fr', types: 'place,locality,neighborhood,postcode,district,street,address', limit: '8', proximity: `${center.lng},${center.lat}` });
        const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json() as SuggestResponse;
        if (requestId.current === id) setResults(data.suggestions ?? []);
      } catch {
        if (requestId.current === id) setError('Locaties laden lukt niet. Probeer het opnieuw.');
      } finally { if (requestId.current === id) setLoading(false); }
    }, 280);
    return () => clearTimeout(timer);
  }, [text, center]);

  const choose = async (suggestion: Suggestion) => {
    Keyboard.dismiss(); setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ access_token: mapboxToken, session_token: sessionToken.current });
      const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}?${params}`);
      if (!response.ok) throw new Error('Retrieve failed');
      const data = await response.json() as RetrieveResponse;
      const feature = data.features?.[0];
      const coordinates = feature?.geometry?.coordinates;
      if (!coordinates) throw new Error('Missing coordinates');
      const label = feature.properties?.name ?? suggestion.name;
      setSearchLocation({ lng: coordinates[0], lat: coordinates[1] }, label);
      router.back();
    } catch { setError('Deze locatie kon niet worden geselecteerd. Probeer een andere.'); }
    finally { setLoading(false); }
  };

  const chooseCurrentLocation = async () => {
    setLocating(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) { setError('Sta locatietoegang toe om je huidige locatie te gebruiken.'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(coords);
      const label = await labelForCoordinates(coords);
      setSearchLocation(coords, label);
      router.back();
    } catch { setError('Je locatie kon niet worden bepaald.'); }
    finally { setLocating(false); }
  };

  return <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
    <View className="h-14 flex-row items-center px-5">
      <Pressable accessibilityRole="button" accessibilityLabel="Terug" onPress={() => router.back()} className="mr-4 h-11 w-8 justify-center"><Ionicons name="arrow-back" size={26} color={brandColors.navy} /></Pressable>
      <Text className="text-xl font-bold text-ink">Locatie</Text>
    </View>
    <View className="mx-5 mt-5 h-[58px] flex-row items-center rounded-2xl border-[1.5px] border-[#817BFA] px-4">
      <Ionicons name="search-outline" size={23} color="#858A96" />
      <TextInput value={text} onChangeText={setText} placeholder="Zoek een plaats of postcode" placeholderTextColor="#9296A0" autoFocus returnKeyType="search" accessibilityLabel="Zoek een plaats of postcode" className="ml-3 flex-1 text-base text-ink" />
      {text ? <Pressable accessibilityRole="button" accessibilityLabel="Wis zoekopdracht" onPress={() => setText('')} hitSlop={10}><Ionicons name="close" size={25} color={brandColors.navy} /></Pressable> : null}
    </View>
    <Pressable accessibilityRole="button" onPress={chooseCurrentLocation} disabled={locating} className="mx-5 mt-4 flex-row items-center gap-4 border-b border-line py-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F0EEFF]"><Ionicons name="navigate" size={20} color={brandColors.lavender} /></View>
      <View className="flex-1"><Text className="text-base font-semibold text-ink">Gebruik mijn huidige locatie</Text><Text className="mt-0.5 text-sm text-muted">{savedLabel}</Text></View>
      {locating ? <ActivityIndicator color={brandColors.blue} /> : null}
    </Pressable>
    {!text.trim() ? <Pressable accessibilityRole="button" onPress={() => { setSearchLocation(GHENT, 'Gent'); router.back(); }} className="mx-5 flex-row items-center gap-4 border-b border-line py-4">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F0EEFF]"><Ionicons name="location" size={20} color={brandColors.lavender} /></View><View><Text className="text-base font-semibold text-ink">Gent</Text><Text className="mt-0.5 text-sm text-muted">België · standaardlocatie</Text></View>
    </Pressable> : null}
    {loading && !locating ? <ActivityIndicator accessibilityLabel="Locaties laden" color={brandColors.blue} style={{ marginTop: 28 }} /> : null}
    {error ? <Text className="mx-6 mt-5 text-sm text-muted">{error}</Text> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      {results.map((item) => <Pressable key={item.mapbox_id} accessibilityRole="button" onPress={() => void choose(item)} className="mx-5 flex-row items-center gap-4 border-b border-line py-4">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F0EEFF]"><Ionicons name="location" size={21} color={brandColors.lavender} /></View>
        <View className="flex-1"><Text numberOfLines={1} className="text-base font-semibold text-ink">{item.name}</Text><Text numberOfLines={2} className="mt-0.5 text-sm text-muted">{item.place_formatted ?? item.full_address ?? ''}</Text></View>
      </Pressable>)}
      {text.trim().length >= 2 && !loading && !error && results.length === 0 ? <Text className="mx-6 mt-6 text-sm text-muted">Geen locaties gevonden.</Text> : null}
    </ScrollView>
  </View>;
}
