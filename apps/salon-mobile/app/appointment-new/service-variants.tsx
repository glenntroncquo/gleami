import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Pressable } from '@/components/pressable-scale';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchServices,
  phasesForEditor,
  ServiceWithVariants,
  spanDurationFromPhases,
  variantDurationMinutes,
} from '@/lib/api/services';
import { COLOR_MAP, mapTreatmentColorToEventColor } from '@/lib/treatment-colors';

import { APPOINTMENT_DRAFT_EVENTS, CartItem } from '@/lib/appointment-draft';

export default function ServiceVariantsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { serviceId, staffId } = useLocalSearchParams<{ serviceId: string; staffId: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [service, setService] = React.useState<ServiceWithVariants | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    fetchServices(companyId, locationId)
      .then((list) => setService(list.find((s) => s.id === serviceId) ?? null))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [companyId, locationId, serviceId]);

  const addVariant = React.useCallback(
    (variant: ServiceWithVariants['service_variant'][number]) => {
      if (!service) return;
      Haptics.selectionAsync();
      const phases = phasesForEditor(variant);
      const item: CartItem = {
        serviceId: service.id,
        serviceVariantId: variant.id,
        serviceName: service.name,
        color: service.color,
        variantName: variant.name,
        price: variant.price,
        durationMinutes: spanDurationFromPhases(phases),
        staffId,
        phases,
      };
      DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.addService, item);
      router.dismissTo('/appointment-new');
    },
    [service, staffId, router]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: service?.name ?? '',
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.back'),
              icon: { type: 'sfSymbol', name: 'chevron.left' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="back" size={22} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />
      {loading ? (
        <ActivityIndicator style={styles.loading} color={theme.muted} />
      ) : !service || service.service_variant.length === 0 ? (
        <EmptyState icon="gridView" title={t('service.noVariants')} subtitle={t('service.noVariantsHint')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic">
          {service.service_variant.map((variant) => (
            <Pressable key={variant.id} style={styles.row} onPress={() => addVariant(variant)}>
              <View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] }]} />
              <View style={styles.flexFill}>
                <Text style={styles.rowTitle}>{variant.name}</Text>
                <Text style={styles.rowMeta}>{`${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`}</Text>
              </View>
              <View style={styles.plusButton}>
                <AppIcon name="add" size={18} color={theme.text} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: typeof Colors.light) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    flexFill: {
      flex: 1,
    },
    loading: {
      marginTop: 24,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: Design.controlRadius,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    rowMeta: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    plusButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
  });
}
