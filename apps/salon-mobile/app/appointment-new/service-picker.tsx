import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Button, FormFooter, ListGroup, ListRow, ScreenTitle, useTheme } from '@/components/ui';
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

export default function ServicePickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId, selected } = useLocalSearchParams<{ staffId: string; selected?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const theme = useTheme();

  const [servicesList, setServicesList] = React.useState<ServiceWithVariants[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [addedIds, setAddedIds] = React.useState<Set<string>>(
    () => new Set((selected ?? '').split(',').map((id) => id.trim()).filter(Boolean))
  );

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    fetchServices(companyId, locationId)
      .then(setServicesList)
      .catch(() => setServicesList([]))
      .finally(() => setLoading(false));
  }, [companyId, locationId]);

  const toggleService = React.useCallback(
    (service: ServiceWithVariants, variant: ServiceWithVariants['service_variant'][number]) => {
      Haptics.selectionAsync();
      if (addedIds.has(variant.id)) {
        setAddedIds((prev) => {
          const next = new Set(prev);
          next.delete(variant.id);
          return next;
        });
        DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.removeService, { serviceVariantId: variant.id });
        return;
      }
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
      setAddedIds((prev) => new Set(prev).add(variant.id));
      DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.addService, item);
    },
    [addedIds, staffId]
  );

  const filteredServices = servicesList.filter((service) => service.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  const rows: React.ReactElement[] = [];
  filteredServices.forEach((service) => {
    const variants = service.service_variant;
    const single = variants.length === 1 ? variants[0] : null;
    const added = single ? addedIds.has(single.id) : variants.some((variant) => addedIds.has(variant.id));
    const expanded = expandedId === service.id;
    rows.push(
      <ListRow
        key={service.id}
        title={service.name}
        subtitle={
          single
            ? `${variantDurationMinutes(single)} ${t('appointment.minutesShort')} · €${single.price}`
            : t('appointment.optionsCount', { count: variants.length })
        }
        leading={<View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] }]} />}
        chevron={false}
        trailing={
          <AppIcon
            name={single ? (added ? 'check' : 'add') : expanded ? 'arrowUp' : 'expandMore'}
            size={18}
            color={added ? theme.tint : theme.muted}
          />
        }
        onPress={() => {
          if (single) {
            toggleService(service, single);
            return;
          }
          setExpandedId(expanded ? null : service.id);
        }}
      />
    );
    if (!single && expanded) {
      variants.forEach((variant) => {
        const variantAdded = addedIds.has(variant.id);
        rows.push(
          <ListRow
            key={variant.id}
            title={variant.name}
            subtitle={`${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`}
            leading={<View style={styles.swatchSpacer} />}
            chevron={false}
            trailing={<AppIcon name={variantAdded ? 'check' : 'add'} size={18} color={variantAdded ? theme.tint : theme.muted} />}
            onPress={() => toggleService(service, variant)}
          />
        );
      });
    }
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <RowListSkeleton count={8} />
      ) : servicesList.length === 0 ? (
        <EmptyState
          icon="gridView"
          title={t('service.noServices')}
          subtitle={t('service.noServicesHint')}
          actionLabel={t('service.addNew')}
          onAction={() => router.push('/services/new')}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic">
          <ScreenTitle title={t('appointment.selectService')} />
          <View style={[styles.search, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <AppIcon name="search" size={18} color={theme.muted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('appointment.searchServicePlaceholder')}
              placeholderTextColor={theme.muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              accessibilityLabel={t('appointment.searchServicePlaceholder')}
            />
          </View>
          {rows.length > 0 ? <ListGroup>{rows}</ListGroup> : null}
        </ScrollView>
      )}
      <FormFooter>
        <Button label={t('appointment.done')} onPress={() => router.back()} />
      </FormFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Design.screenPadding, paddingTop: 24, paddingBottom: 32, gap: 16 },
  search: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Design.controlRadius,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12 },
  swatch: { width: 40, height: 40, borderRadius: 12 },
  swatchSpacer: { width: 40 },
});
