import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { itemName, type CatalogItem } from '@/src/booking/catalog';
import { formatPrice } from '@/src/format';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

/** Selectable service card: outlined when idle, lavender with a check when picked. */
export function ServiceRow({
  item,
  selected,
  withService,
  onToggle,
}: {
  item: CatalogItem;
  selected: boolean;
  /**
   * Lead with the service name. Needed in mixed lists like "Aanbevolen", where
   * a bare variant ("Kort") says nothing without the treatment it belongs to.
   */
  withService?: boolean;
  onToggle: () => void;
}) {
  const variantName = itemName(item);
  const name = withService ? item.service.name : variantName;
  const minutes = item.variant.durationMinutes;
  const meta = [
    withService && variantName !== item.service.name ? variantName : null,
    minutes > 0 ? t('salon.minutes', { count: minutes }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync().catch(() => undefined);
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${formatPrice(item.variant.price)}`}
      className="mb-3 flex-row items-end gap-3 rounded-2xl bg-canvas p-4 active:opacity-90"
      style={{
        borderWidth: 2,
        borderColor: selected ? brandColors.lavender : brandColors.line,
      }}>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{name}</Text>
        {meta ? <Text className="mt-1 text-sm text-muted">{meta}</Text> : null}
        <Text className="mt-3 text-base font-semibold text-ink">{formatPrice(item.variant.price)}</Text>
      </View>
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? brandColors.lavender : brandColors.surface }}>
        <Ionicons
          name={selected ? 'checkmark' : 'add'}
          size={selected ? 18 : 20}
          color={selected ? '#ffffff' : brandColors.navy}
        />
      </View>
    </Pressable>
  );
}
