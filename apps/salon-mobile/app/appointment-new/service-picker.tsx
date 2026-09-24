import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Pressable } from '@/components/pressable-scale';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
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

export default function ServicePickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId, selected } = useLocalSearchParams<{ staffId: string; selected?: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.selectService'),
          headerRight: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8} style={styles.headerTextButton}>
              <Text style={styles.headerDoneText}>{t('appointment.done')}</Text>
            </HeaderButton>
          ),
        }}
      />
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
          <View style={styles.searchInputRow}>
            <AppIcon name="search" size={18} color={theme.muted} />
            <TextInput
              style={styles.searchInputText}
              placeholder={t('appointment.searchServicePlaceholder')}
              placeholderTextColor={theme.muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
          {filteredServices.map((service) => {
            const variants = service.service_variant;
            const single = variants.length === 1 ? variants[0] : null;
            const added = single ? addedIds.has(single.id) : variants.some((variant) => addedIds.has(variant.id));
            const expanded = expandedId === service.id;
            return (
              <View key={service.id}>
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    if (single) {
                      toggleService(service, single);
                      return;
                    }
                    setExpandedId(expanded ? null : service.id);
                  }}>
                  <View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] }]} />
                  <View style={styles.flexFill}>
                    <Text style={styles.rowTitle}>{service.name}</Text>
                    <Text style={styles.rowMeta}>
                      {single
                        ? `${variantDurationMinutes(single)} ${t('appointment.minutesShort')} · €${single.price}`
                        : t('appointment.optionsCount', { count: variants.length })}
                    </Text>
                  </View>
                  <AppIcon
                    name={single ? (added ? 'check' : 'add') : expanded ? 'arrowUp' : 'expandMore'}
                    size={18}
                    color={added && single ? theme.tint : theme.muted}
                  />
                </Pressable>
                {!single && expanded
                  ? variants.map((variant) => {
                      const variantAdded = addedIds.has(variant.id);
                      return (
                        <Pressable key={variant.id} style={styles.variantRow} onPress={() => toggleService(service, variant)}>
                          <View style={styles.flexFill}>
                            <Text style={styles.rowTitle}>{variant.name}</Text>
                            <Text style={styles.rowMeta}>{`${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`}</Text>
                          </View>
                          <AppIcon name={variantAdded ? 'check' : 'add'} size={18} color={variantAdded ? theme.tint : theme.muted} />
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            );
          })}
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
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    headerDoneText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.tint,
    },
    loading: {
      marginTop: 24,
    },
    flexFill: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    searchInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchInputText: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      padding: 0,
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
    variantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginLeft: 52,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
  });
}
