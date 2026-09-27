import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { Easing, FadeIn } from 'react-native-reanimated';

import { useBooking } from '@/src/booking/booking-context';
import { buildCatalog, itemKey, RECOMMENDED_ID, totalMinutes, totalPrice } from '@/src/booking/catalog';
import { closeBooking } from '@/src/booking/navigation';
import {
  BOOKING_BAR_HEIGHT,
  BookingFooter,
  BookingHeader,
} from '@/src/components/booking/booking-chrome';
import { CategoryChipRow } from '@/src/components/booking/category-chip-row';
import { CategoryOverview } from '@/src/components/booking/category-overview';
import { ServiceRow } from '@/src/components/booking/service-row';
import { formatPrice } from '@/src/format';
import { useLocation } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';

export default function SelectServicesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const location = useLocation(slug ?? '');
  const booking = useBooking();
  const listRef = useRef<ScrollView>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);

  const categories = useMemo(() => buildCatalog(location.data?.services ?? []), [location.data]);
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const active = categories.find((category) => category.id === activeId) ?? categories[0];

  const selectCategory = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    listRef.current?.scrollTo({ y: 0, animated: false });
  };

  const price = totalPrice(booking.items);
  const minutes = totalMinutes(booking.items);
  const count = booking.items.length;

  return (
    <View className="flex-1 bg-canvas">
      <BookingHeader title={t('booking.selectServices')} onClose={() => closeBooking(slug ?? '')} />

      {categories.length > 1 ? (
        <View className="pb-2 pt-1">
          <CategoryChipRow
            categories={categories}
            selected={activeId}
            onSelect={selectCategory}
            onOverview={() => setOverviewOpen(true)}
          />
        </View>
      ) : null}

      <ScrollView
        ref={listRef}
        className="flex-1 bg-surface"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: BOOKING_BAR_HEIGHT + 40 }}>
        {active ? (
          <Animated.View key={active.id} entering={FadeIn.duration(200).easing(Easing.out(Easing.cubic))}>
            <Text accessibilityRole="header" className="mb-3 text-xl font-bold tracking-tight text-ink">
              {active.name}
            </Text>
            {active.items.map((item) => (
              <ServiceRow
                key={itemKey(item)}
                item={item}
                selected={booking.selectedKeys.has(itemKey(item))}
                withService={active.id === RECOMMENDED_ID}
                onToggle={() => booking.toggleItem(item)}
              />
            ))}
          </Animated.View>
        ) : (
          <Text className="text-sm text-muted">{t('salon.emptyServices')}</Text>
        )}
      </ScrollView>

      <BookingFooter
        price={formatPrice(price)}
        meta={count === 1 ? t('booking.cartOne', { minutes }) : t('booking.cartMany', { count, minutes })}
        hint={count === 0 ? t('booking.pickOne') : undefined}
        label={t('booking.continue')}
        disabled={count === 0}
        onPress={() => router.push({ pathname: '/book/[slug]/time', params: { slug: slug ?? '' } })}
      />

      {overviewOpen ? (
        <CategoryOverview
          categories={categories}
          selected={activeId}
          selectedCount={(categoryId) => {
            const category = categories.find((entry) => entry.id === categoryId);
            if (!category) return 0;
            return category.items.filter((item) => booking.selectedKeys.has(itemKey(item))).length;
          }}
          onSelect={selectCategory}
          onClose={() => setOverviewOpen(false)}
        />
      ) : null}
    </View>
  );
}
