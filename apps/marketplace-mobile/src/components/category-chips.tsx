import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { useCategories } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { useDiscovery } from '@/src/store/discovery';

export function CategoryChips() {
  const categories = useCategories();
  const selected = useDiscovery((state) => state.categoryIds[0] ?? null);
  const setCategory = useDiscovery((state) => state.setCategory);

  const choose = (id: string | null) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setCategory(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      <Chip label={t('discover.allCategories')} selected={selected == null} onPress={() => choose(null)} />
      {(categories.data ?? []).map((category) => (
        <Chip
          key={category.id}
          label={category.name}
          selected={selected === category.id}
          onPress={() => choose(selected === category.id ? null : category.id)}
        />
      ))}
      {categories.isError ? (
        <Pressable
          onPress={() => categories.refetch()}
          accessibilityRole="button"
          accessibilityLabel={t('discover.categoriesError')}
          className="justify-center rounded-full bg-white/90 px-3">
          <Text className="text-sm text-muted">{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={
        selected
          ? 'rounded-full bg-accent px-4 py-2'
          : 'rounded-full border border-line bg-white/95 px-4 py-2'
      }>
      <Text className={selected ? 'text-sm font-semibold text-white' : 'text-sm font-medium text-ink'}>{label}</Text>
    </Pressable>
  );
}
