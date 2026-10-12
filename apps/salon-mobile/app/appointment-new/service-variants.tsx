import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { ListGroup, ListRow, ScreenTitle, useTheme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from '@/contexts/location-context';
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
  const theme = useTheme();

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerShadowVisible: false,
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
            <HeaderButton onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('common.back')}>
              <AppIcon name="back" size={22} color={theme.text} />
            </HeaderButton>
          ),
        }}
      />
      {loading ? (
        <RowListSkeleton count={4} />
      ) : !service || service.service_variant.length === 0 ? (
        <EmptyState icon="gridView" title={t('service.noVariants')} subtitle={t('service.noVariantsHint')} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} contentInsetAdjustmentBehavior="automatic">
          <ScreenTitle title={service.name} />
          <ListGroup>
            {service.service_variant.map((variant) => (
              <ListRow
                key={variant.id}
                title={variant.name}
                subtitle={`${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`}
                leading={<View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] }]} />}
                chevron={false}
                trailing={<AppIcon name="add" size={18} color={theme.muted} />}
                onPress={() => addVariant(variant)}
              />
            ))}
          </ListGroup>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Design.screenPadding, paddingTop: 4, paddingBottom: 32, gap: 16 },
  swatch: { width: 40, height: 40, borderRadius: 12 },
});
