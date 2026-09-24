import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SuggestItem } from '@/src/api/types';
import { ErrorState, OfflineState, ScreenState } from '@/src/components/screen-state';
import { useSuggestions } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

const TYPE_LABEL: Record<SuggestItem['type'], string> = {
  category: 'search.category',
  service: 'search.service',
  location: 'search.location',
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const initial = useDiscovery((state) => state.q);
  const setQuery = useDiscovery((state) => state.setQuery);
  const setCategory = useDiscovery((state) => state.setCategory);
  const [text, setText] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const suggestions = useSuggestions(debounced);
  const trimmed = debounced.trim();

  const select = (item: SuggestItem) => {
    if (item.type === 'category') {
      setCategory(item.id);
      setQuery('');
      router.back();
      return;
    }
    if (item.type === 'service') {
      setCategory(null);
      setQuery(item.name);
      router.back();
      return;
    }
    if (item.slug) {
      router.replace({ pathname: '/salon/[slug]', params: { slug: item.slug } });
    }
  };

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-3 px-5">
        <View className="flex-1 flex-row items-center gap-2 rounded-full border border-line bg-surface px-4">
          <Ionicons name="search" size={18} color="#78716c" />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#a8a29e"
            accessibilityLabel={t('search.title')}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-3 text-base text-ink"
          />
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          className="py-2">
          <Text className="text-base font-medium text-ink">{t('common.cancel')}</Text>
        </Pressable>
      </View>
      {!online && !suggestions.data ? (
        <OfflineState onRetry={() => suggestions.refetch()} />
      ) : trimmed.length === 0 ? (
        <ScreenState icon="search" title={t('search.title')} body={t('search.emptyPrompt')} />
      ) : suggestions.isLoading ? (
        <ActivityIndicator color="#1c1917" style={{ marginTop: 32 }} />
      ) : suggestions.isError ? (
        <ErrorState onRetry={() => suggestions.refetch()} />
      ) : (
        <FlatList
          data={suggestions.data?.items ?? []}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          ListEmptyComponent={<ScreenState icon="search" title={t('search.noResults')} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => select(item)}
              disabled={item.type === 'location' && !item.slug}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${t(TYPE_LABEL[item.type])}`}
              className="flex-row items-center justify-between border-b border-line py-4">
              <Text className="flex-1 pr-3 text-base text-ink">{item.name}</Text>
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t(TYPE_LABEL[item.type])}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
