import { AnimatedHeart } from '@/src/components/animated-heart';
import { brandColors } from '@/src/theme/colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Linking, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LocationGetResponse, LocationService, ServiceVariant } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { openBooking } from '@/src/booking/navigation';
import { GlassButton } from '@/src/components/glass';
import { MediaCarousel } from '@/src/components/media-carousel';
import { ErrorState, OfflineState } from '@/src/components/screen-state';
import { SkeletonBlock, SkeletonText } from '@/src/components/skeleton';
import { formatCount, formatDistance, formatPrice } from '@/src/format';
import { useLocation, useToggleLike } from '@/src/hooks/use-marketplace';
import { t } from '@/src/i18n';
import { buildServiceBookingUrl } from '@/src/lib/booking-url';
import { distanceKm } from '@/src/lib/geo';
import { useOnline } from '@/src/lib/online';
import { useDiscovery } from '@/src/store/discovery';

const HERO = 360;
/** How far the content sheet overlaps the bottom of the photo. */
const OVERLAP = 24;
const BAR = 52;
const TABS = 44;
const ABOUT_LINES = 4;

type SectionKey = 'photos' | 'about' | 'services' | 'team';
const SECTION_ORDER: SectionKey[] = ['photos', 'about', 'services', 'team'];
type SectionLayout = (key: SectionKey, y: number) => void;

export default function SalonScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const online = useOnline();
  const { user } = useAuth();
  const location = useLocation(slug ?? '');
  const likes = useToggleLike();
  const data = location.data;
  const liked = data ? likes.likedIds.has(data.location.locationId) : false;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const sectionTops = useSharedValue<Partial<Record<SectionKey, number>>>({
    photos: 0,
  });
  const [activeSection, setActiveSection] = useState<SectionKey>('photos');
  const [collapsed, setCollapsed] = useState(false);

  const tapLockUntil = useRef(0);
  const pendingSection = useRef<SectionKey | null>(null);
  const onScrolledToSection = (key: SectionKey) => {
    if (Date.now() < tapLockUntil.current) {
      pendingSection.current = key;
      return;
    }
    setActiveSection(key);
  };

  const headerHeight = insets.top + BAR + TABS;
  const collapseAt = HERO - OVERLAP - headerHeight;

  useAnimatedReaction(
    () => {
      const line = scrollY.value + headerHeight + 8;
      let current: SectionKey = 'photos';
      for (const key of SECTION_ORDER) {
        const top = sectionTops.value[key];
        if (top != null && line >= top) current = key;
      }
      return current;
    },
    (current, previous) => {
      if (current !== previous) runOnJS(onScrolledToSection)(current);
    },
  );
  useAnimatedReaction(
    () => scrollY.value > collapseAt - 24,
    (next, previous) => {
      if (next !== previous) runOnJS(setCollapsed)(next);
    },
  );

  const onSectionLayout: SectionLayout = (key, y) => {
    sectionTops.value = { ...sectionTops.value, [key]: HERO - OVERLAP + y };
  };
  const scrollToSection = (key: SectionKey) => {
    const top = key === 'photos' ? 0 : sectionTops.value[key];
    if (top == null) return;
    setActiveSection(key);
    pendingSection.current = null;
    tapLockUntil.current = Date.now() + 600;
    setTimeout(() => {
      if (pendingSection.current && Date.now() >= tapLockUntil.current) setActiveSection(pendingSection.current);
    }, 650);
    scrollRef.current?.scrollTo({
      y: key === 'photos' ? 0 : Math.max(0, top - headerHeight),
      animated: true,
    });
  };
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseAt - 48, collapseAt], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [collapseAt + 10, collapseAt + 50], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [collapseAt + 10, collapseAt + 50], [6, 0], Extrapolation.CLAMP),
      },
    ],
  }));
  const heroStyle = useAnimatedStyle(() => {
    const pull = Math.min(scrollY.value, 0);
    const push = Math.max(scrollY.value, 0);
    return {
      transform: [{ translateY: pull / 2 + push * 0.35 }, { scale: 1 - pull / HERO }],
    };
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  /** Opens the native booking flow, with the tapped option already in the cart. */
  const book = (variant?: ServiceVariant) => {
    if (!data) return;
    openBooking(data.location.slug, variant?.serviceVariantId);
  };

  const onHeart = () => {
    if (!data) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    likes.toggle({ locationId: data.location.locationId, liked });
  };

  const onShare = () => {
    if (!data) return;
    const url = buildServiceBookingUrl({
      companyId: data.location.companyId,
      locationId: data.location.locationId,
    });
    void Share.share(
      Platform.OS === 'ios'
        ? {
            message: t('salon.shareMessage', {
              name: data.location.name,
              url: '',
            }).trim(),
            url,
          }
        : {
            message: t('salon.shareMessage', { name: data.location.name, url }),
          },
    ).catch(() => undefined);
  };

  const barHeight = 12 + 48 + Math.max(insets.bottom, 12);
  const revealServices = () => {
    const top = sectionTops.value.services;
    if (top == null) return;
    const target = top - headerHeight;
    if (scrollY.value > target + 1) scrollRef.current?.scrollTo({ y: target, animated: true });
  };
  const optionCount = data?.services.reduce((sum, service) => sum + service.variants.length, 0) ?? 0;
  const tabs: SectionKey[] = data
    ? SECTION_ORDER.filter((key) => {
        if (key === 'about') return Boolean(data.location.description);
        if (key === 'team') return Boolean(data.team?.length);
        return true;
      })
    : [];

  return (
    <View className="flex-1 bg-canvas">
      {!online && !data ? (
        <View style={{ paddingTop: insets.top + BAR }}>
          <OfflineState onRetry={() => location.refetch()} />
        </View>
      ) : location.isLoading ? (
        <SalonSkeleton barHeight={barHeight} bottomInset={insets.bottom} />
      ) : location.isError || !data ? (
        <View style={{ paddingTop: insets.top + BAR + 16 }} className="px-5">
          <ErrorState onRetry={() => location.refetch()} />
          <Text className="mt-2 text-center text-sm text-muted">{t('salon.notFound')}</Text>
        </View>
      ) : (
        <Animated.View className="flex-1" entering={CONTENT_FADE}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: barHeight + 24 }}>
            <Animated.View style={[{ height: HERO }, heroStyle]}>
              <MediaCarousel
                images={data.location.images.length > 0 ? data.location.images : [data.location.imageUrl]}
                height={HERO}
                label={data.location.name}
                indicator="count"
                indicatorInset={OVERLAP}
              />
            </Animated.View>
            <SalonBody
              data={data}
              onBook={book}
              onSectionLayout={onSectionLayout}
              onFilterChange={revealServices}
              listMinHeight={Math.max(0, windowHeight - headerHeight - barHeight - 120)}
              scrollY={scrollY}
              headerHeight={headerHeight}
            />
          </Animated.ScrollView>

          <Animated.View
            pointerEvents="none"
            className="absolute left-0 right-0 top-0 bg-canvas"
            style={[{ height: headerHeight, boxShadow: '0 1px 0 rgba(7,29,67,0.08)' }, barStyle]}
          />
          <Animated.View
            pointerEvents={collapsed ? 'box-none' : 'none'}
            accessibilityElementsHidden={!collapsed}
            importantForAccessibility={collapsed ? 'auto' : 'no-hide-descendants'}
            className="absolute left-0 right-0"
            style={[{ top: insets.top + BAR, height: TABS }, barStyle]}>
            <SectionTabs tabs={tabs} active={activeSection} onSelect={scrollToSection} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            className="absolute left-0 right-0 items-center justify-center px-28"
            style={[{ top: insets.top, height: BAR }, titleStyle]}>
            <Text numberOfLines={1} className="text-base font-semibold text-ink">
              {data.location.name}
            </Text>
          </Animated.View>

          <View
            className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-canvas px-5 pt-3"
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              boxShadow: '0 -1px 0 rgba(7,29,67,0.06)',
            }}>
            <Text className="text-sm text-muted">
              {optionCount === 1
                ? t('salon.serviceAvailable')
                : t('salon.servicesAvailable', {
                    count: formatCount(optionCount),
                  })}
            </Text>
            <Pressable
              onPress={() => book()}
              accessibilityRole="button"
              accessibilityLabel={t('salon.bookNow')}
              className="h-12 items-center justify-center rounded-full bg-ink px-6 active:opacity-80">
              <Text className="text-base font-semibold text-white">{t('salon.bookNow')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      <View className="absolute left-4" style={{ top: insets.top + (BAR - 44) / 2 }}>
        <GlassButton onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={21} color={brandColors.navy} />
        </GlassButton>
      </View>
      {data ? (
        <Animated.View
          entering={CONTENT_FADE}
          className="absolute right-4 flex-row gap-2.5"
          style={{ top: insets.top + (BAR - 44) / 2 }}>
          <GlassButton onPress={onShare} accessibilityRole="button" accessibilityLabel={t('salon.share')}>
            <Ionicons name="share-outline" size={20} color={brandColors.navy} style={{ marginTop: -2 }} />
          </GlassButton>
          <GlassButton
            onPress={onHeart}
            accessibilityRole="button"
            accessibilityLabel={liked ? t('favorites.unlike') : t('favorites.like')}
            accessibilityState={{ selected: liked }}>
            <AnimatedHeart liked={liked} size={21} />
          </GlassButton>
        </Animated.View>
      ) : null}
    </View>
  );
}

const CONTENT_FADE = FadeIn.duration(320).easing(Easing.out(Easing.cubic));

/** Same geometry as the loaded page (hero, sheet, title, address, chips, option rows, bottom bar). */
function SalonSkeleton({ barHeight, bottomInset }: { barHeight: number; bottomInset: number }) {
  const chipWidths = [52, 118, 92, 136];
  const rows = [
    { name: '46%', meta: 56 },
    { name: '38%', meta: 48 },
    { name: '54%', meta: 56 },
    { name: '42%', meta: 64 },
  ] as const;
  return (
    <View className="flex-1" accessibilityLabel={t('states.loading')} accessibilityRole="progressbar">
      <View style={{ paddingBottom: barHeight + 24 }}>
        <SkeletonBlock style={{ height: HERO, borderRadius: 0 }} />
        <View
          className="bg-canvas px-5 pt-6"
          style={{ marginTop: -OVERLAP, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <SkeletonText lineHeight={36} size={22} width="64%" />
          <SkeletonText lineHeight={24} size={12} width="42%" style={{ marginTop: 4 }} />
          <View className="mt-5 flex-row items-center gap-2">
            <SkeletonBlock style={{ width: 14, height: 14, borderRadius: 7 }} />
            <SkeletonText lineHeight={20} size={10} width="68%" />
          </View>
          <View className="pt-10">
            <SkeletonText lineHeight={28} size={16} width={104} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, paddingVertical: 8, overflow: 'hidden' }}>
              {chipWidths.map((width) => (
                <SkeletonBlock key={width} style={{ height: 40, width, borderRadius: 20 }} />
              ))}
            </View>
            <View className="mt-2">
              {rows.map((row, index) => (
                <View
                  key={index}
                  className={
                    index === 0
                      ? 'flex-row items-center gap-4 py-5'
                      : 'flex-row items-center gap-4 border-t border-line py-5'
                  }>
                  <View className="flex-1">
                    <SkeletonText lineHeight={24} size={13} width={row.name} />
                    <SkeletonText lineHeight={20} size={10} width={row.meta} style={{ marginTop: 4 }} />
                    <SkeletonText lineHeight={24} size={13} width={72} style={{ marginTop: 8 }} />
                  </View>
                  <SkeletonBlock style={{ height: 36, width: 64, borderRadius: 18 }} />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-canvas px-5 pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 12), boxShadow: '0 -1px 0 rgba(7,29,67,0.06)' }}>
        <SkeletonText lineHeight={20} size={10} width={150} />
        <SkeletonBlock style={{ height: 48, width: 128, borderRadius: 24 }} />
      </View>
    </View>
  );
}

const INDICATOR = 3;
const TAB_GAP = 24;
const TAB_PAD = 20;
const indicatorTiming = { duration: 260, easing: Easing.bezier(0.25, 1, 0.5, 1) };

/** Section tabs with one indicator that slides and resizes between tabs. */
function SectionTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: SectionKey[];
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
}) {
  const listRef = useRef<ScrollView>(null);
  const [frames, setFrames] = useState<Partial<Record<SectionKey, { x: number; width: number }>>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);
  const frame = frames[active];

  useEffect(() => {
    if (!frame) return;
    if (!placed.current) {
      x.value = frame.x;
      width.value = frame.width;
      placed.current = true;
    } else {
      x.value = withTiming(frame.x, indicatorTiming);
      width.value = withTiming(frame.width, indicatorTiming);
    }
    listRef.current?.scrollTo({ x: Math.max(0, frame.x - TAB_PAD - TAB_GAP), animated: true });
  }, [frame, width, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: width.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <ScrollView
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={{ paddingHorizontal: TAB_PAD, gap: TAB_GAP }}>
      {tabs.map((key) => {
        const selected = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            onLayout={(event) => {
              const { x: left, width: w } = event.nativeEvent.layout;
              setFrames((current) =>
                current[key]?.x === left && current[key]?.width === w
                  ? current
                  : { ...current, [key]: { x: left, width: w } },
              );
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{ height: TABS, justifyContent: 'center' }}>
            <Text className={selected ? 'text-[15px] font-semibold text-ink' : 'text-[15px] font-semibold text-muted'}>
              {t(`salon.tabs.${key}`)}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View
        pointerEvents="none"
        className="absolute bottom-0 left-0 bg-ink"
        style={[
          {
            height: INDICATOR,
            borderTopLeftRadius: INDICATOR,
            borderTopRightRadius: INDICATOR,
            opacity: frame ? 1 : 0,
          },
          indicatorStyle,
        ]}
      />
    </ScrollView>
  );
}

type Chip = { id: string; name: string };

/** Service filter chips; the navy pill slides to the selected chip. */
function ServiceChips({
  chips,
  selected,
  onSelect,
}: {
  chips: Chip[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const [frames, setFrames] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);
  const frame = frames[selected];

  useEffect(() => {
    if (!frame) return;
    if (!placed.current) {
      x.value = frame.x;
      width.value = frame.width;
      placed.current = true;
    } else {
      x.value = withTiming(frame.x, indicatorTiming);
      width.value = withTiming(frame.width, indicatorTiming);
    }
    const centered = frame.x - (viewport.current - frame.width) / 2;
    listRef.current?.scrollTo({ x: Math.max(0, centered), animated: true });
  }, [frame, width, x]);

  const pillStyle = useAnimatedStyle(() => ({
    width: width.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <ScrollView
      ref={listRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => {
        viewport.current = event.nativeEvent.layout.width;
      }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      <Animated.View
        pointerEvents="none"
        className="absolute left-0 top-0 h-10 rounded-full bg-ink"
        style={[{ opacity: frame ? 1 : 0 }, pillStyle]}
      />
      {chips.map((chip) => {
        const active = chip.id === selected;
        return (
          <Pressable
            key={chip.id}
            onPress={() => onSelect(chip.id)}
            onLayout={(event) => {
              const { x: left, width: w } = event.nativeEvent.layout;
              setFrames((current) =>
                current[chip.id]?.x === left && current[chip.id]?.width === w
                  ? current
                  : { ...current, [chip.id]: { x: left, width: w } },
              );
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={
              active
                ? 'h-10 justify-center rounded-full border border-transparent px-4'
                : 'h-10 justify-center rounded-full border border-line px-4'
            }>
            <Text className={active ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-ink'}>
              {chip.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SalonBody({
  data,
  onBook,
  onSectionLayout,
  onFilterChange,
  listMinHeight,
  scrollY,
  headerHeight,
}: {
  data: LocationGetResponse;
  onBook: (variant: ServiceVariant) => void;
  onSectionLayout: SectionLayout;
  /** Called after a chip is picked, so the parent can bring the list into view. */
  onFilterChange: () => void;
  /** Keeps the list tall enough that switching to a short service never yanks the scroll position. */
  listMinHeight: number;
  scrollY: SharedValue<number>;
  headerHeight: number;
}) {
  const userLocation = useDiscovery((state) => state.userLocation);

  const servicesTop = useSharedValue(0);
  const servicesHeight = useSharedValue(0);
  const chipsY = useSharedValue(0);
  const chipsHeight = useSharedValue(0);
  /** Pins the chips under the header while the options scroll, releasing at the end of the list. */
  const stickStyle = useAnimatedStyle(() => {
    const start = servicesTop.value + chipsY.value - headerHeight;
    const max = Math.max(0, servicesHeight.value - chipsY.value - chipsHeight.value);
    return { transform: [{ translateY: Math.min(max, Math.max(0, scrollY.value - start)) }] };
  });
  const backdropStyle = useAnimatedStyle(() => {
    const start = servicesTop.value + chipsY.value - headerHeight;
    return { opacity: interpolate(scrollY.value - start, [-8, 8], [0, 1], Extrapolation.CLAMP) };
  });
  const [expanded, setExpanded] = useState(false);
  const [truncates, setTruncates] = useState(false);
  const { location, services, categories } = data;
  const team = data.team ?? [];

  const bookable = useMemo(() => services.filter((service) => service.variants.length > 0), [services]);
  const chips = bookable.map((service) => ({ id: service.serviceId, name: service.name }));
  const [filter, setFilter] = useState(chips[0]?.id ?? '');
  const active = bookable.find((service) => service.serviceId === filter) ?? bookable[0];
  const options = active?.variants.map((variant) => ({ service: active, variant })) ?? [];

  const distance =
    userLocation && location.lat != null && location.lng != null
      ? formatDistance(distanceKm(userLocation, { lat: location.lat, lng: location.lng }))
      : null;
  const address = [location.street, [location.postalCode, location.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  const subtitle = categories
    .slice(0, 2)
    .map((category) => category.name)
    .join(' · ');

  const openMaps = () => {
    if (location.lat == null || location.lng == null) return;
    const label = encodeURIComponent(location.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${location.lat},${location.lng}&q=${label}`
        : `geo:0,0?q=${location.lat},${location.lng}(${label})`;
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View
      className="bg-canvas px-5 pt-6"
      style={{
        marginTop: -OVERLAP,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}>
      <Text className="text-[28px] font-bold leading-9 tracking-tight text-ink">{location.name}</Text>
      {subtitle ? <Text className="mt-1 text-base text-muted">{subtitle}</Text> : null}
      {location.likeCount > 0 ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          <Ionicons name="heart" size={14} color={brandColors.orange} />
          <Text className="text-sm text-muted">{t('salon.likes', { count: formatCount(location.likeCount) })}</Text>
        </View>
      ) : null}
      {address || distance ? (
        <Pressable
          onPress={openMaps}
          accessibilityRole="link"
          accessibilityLabel={t('salon.directions', { name: location.name })}
          className="mt-5 flex-row items-center gap-2 active:opacity-60">
          <Ionicons name="location-sharp" size={16} color={brandColors.navy} />
          <Text numberOfLines={1} className="flex-1 text-sm text-ink">
            {distance ? `${distance} · ` : ''}
            {address}
          </Text>
        </Pressable>
      ) : null}

      {location.description ? (
        <View className="pt-9" onLayout={(event) => onSectionLayout('about', event.nativeEvent.layout.y)}>
          <Text className="text-xl font-bold tracking-tight text-ink">{t('salon.about')}</Text>
          <Text className="mt-3 text-base leading-6 text-ink" numberOfLines={expanded ? undefined : ABOUT_LINES}>
            {location.description}
          </Text>
          <Text
            className="absolute left-0 right-0 top-0 text-base leading-6 opacity-0"
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onTextLayout={(event) => setTruncates(event.nativeEvent.lines.length > ABOUT_LINES)}>
            {location.description}
          </Text>
          {truncates ? (
            <Pressable
              onPress={() => setExpanded((value) => !value)}
              accessibilityRole="button"
              hitSlop={8}
              className="mt-1 self-start">
              <Text className="text-base font-medium" style={{ color: brandColors.lavender }}>
                {expanded ? t('salon.showLess') : t('salon.showMore')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View
        className="pt-10"
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          onSectionLayout('services', y);
          servicesTop.value = HERO - OVERLAP + y;
          servicesHeight.value = height;
        }}>
        <Text className="text-xl font-bold tracking-tight text-ink">{t('salon.services')}</Text>
        {bookable.length > 1 ? (
          <Animated.View
            onLayout={(event) => {
              chipsY.value = event.nativeEvent.layout.y;
              chipsHeight.value = event.nativeEvent.layout.height;
            }}
            style={[{ zIndex: 5, marginHorizontal: -20, marginTop: 6, paddingVertical: 8 }, stickStyle]}>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, backdropStyle]}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={30} tint="light" style={{ position: 'absolute', inset: 0 }} />
              ) : null}
              <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.82)' }} />
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '100%',
                  height: 18,
                  experimental_backgroundImage:
                    'linear-gradient(to bottom, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 100%)',
                }}
              />
            </Animated.View>
            <ServiceChips
              chips={chips}
              selected={filter}
              onSelect={(id) => {
                if (id === filter) return;
                void Haptics.selectionAsync().catch(() => undefined);
                setFilter(id);
                onFilterChange();
              }}
            />
          </Animated.View>
        ) : null}

        {bookable.length === 0 ? (
          <Text className="mt-4 text-sm text-muted">{t('salon.emptyServices')}</Text>
        ) : (
          <Animated.View
            key={filter}
            entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
            className="mt-2"
            style={{ minHeight: listMinHeight }}>
            {options.map(({ service, variant }, index) => (
              <OptionRow
                key={variant.serviceVariantId}
                service={service}
                variant={variant}
                first={index === 0}
                onBook={() => onBook(variant)}
              />
            ))}
          </Animated.View>
        )}
      </View>

      {team.length > 0 ? (
        <View className="pt-10" onLayout={(event) => onSectionLayout('team', event.nativeEvent.layout.y)}>
          <Text className="text-xl font-bold tracking-tight text-ink">{t('salon.tabs.team')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20, marginTop: 16 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 18 }}>
            {team.map((member) => (
              <View key={member.id} className="items-center" style={{ width: 84 }}>
                {member.imageUrl ? (
                  <Image
                    source={{ uri: member.imageUrl }}
                    style={{ width: 72, height: 72, borderRadius: 36 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    className="items-center justify-center rounded-full bg-surface"
                    style={{ width: 72, height: 72 }}>
                    <Text className="text-xl font-semibold text-ink">{initials(member.name)}</Text>
                  </View>
                )}
                <Text numberOfLines={1} className="mt-2 text-sm font-semibold text-ink">
                  {member.name}
                </Text>
                {member.role ? (
                  <Text numberOfLines={1} className="text-xs text-muted">
                    {member.role}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function OptionRow({
  service,
  variant,
  first,
  onBook,
}: {
  service: LocationService;
  variant: ServiceVariant;
  first: boolean;
  onBook: () => void;
}) {
  const name = variant.name.trim() || service.name;
  const meta = variant.durationMinutes > 0 ? t('salon.minutes', { count: variant.durationMinutes }) : '';

  return (
    <View
      className={first ? 'flex-row items-center gap-4 py-5' : 'flex-row items-center gap-4 border-t border-line py-5'}>
      <View className="flex-1">
        <Text className="text-base font-semibold text-ink">{name}</Text>
        {meta ? <Text className="mt-1 text-sm text-muted">{meta}</Text> : null}
        <Text className="mt-2 text-base font-semibold text-ink">{formatPrice(variant.price)}</Text>
      </View>
      <Pressable
        onPress={onBook}
        accessibilityRole="button"
        accessibilityLabel={`${t('salon.book')} ${name}`}
        hitSlop={6}
        className="h-9 justify-center rounded-full border border-line px-4 active:opacity-60">
        <Text className="text-sm font-semibold text-ink">{t('salon.book')}</Text>
      </Pressable>
    </View>
  );
}
