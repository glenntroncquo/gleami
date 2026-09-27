import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CatalogCategory } from '@/src/booking/catalog';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

/** Every category at once, for salons with more chips than fit on screen. */
export function CategoryOverview({
  categories,
  selected,
  selectedCount,
  onSelect,
  onClose,
}: {
  categories: CatalogCategory[];
  selected: string;
  /** Picked rows per category, so the sheet shows what is already in the cart. */
  selectedCount: (categoryId: string) => number;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} statusBarTranslucent>
      <View accessibilityViewIsModal className="flex-1 bg-canvas">
        <View className="flex-row items-center px-5 pb-2 pt-5">
          <Text accessibilityRole="header" className="flex-1 text-xl font-bold tracking-tight text-ink">
            {t('booking.allCategories')}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('booking.close')}
            className="h-10 w-10 items-center justify-center active:opacity-60">
            <Ionicons name="close" size={26} color={brandColors.navy} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
          showsVerticalScrollIndicator={false}>
          {categories.map((category) => {
            const active = category.id === selected;
            const picked = selectedCount(category.id);
            return (
              <Pressable
                key={category.id}
                onPress={() => {
                  onSelect(category.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className="flex-row items-center gap-3 border-b border-line px-5 py-4 active:opacity-60">
                <View className="flex-1">
                  <Text className={active ? 'text-base font-semibold text-ink' : 'text-base text-ink'}>
                    {category.name}
                  </Text>
                  <Text className="mt-0.5 text-sm text-muted">
                    {[
                      category.items.length === 1
                        ? t('booking.categoryOne')
                        : t('booking.categoryMany', { count: category.items.length }),
                      picked > 0 ? t('booking.categorySelected', { selected: picked }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark" size={20} color={brandColors.lavender} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
