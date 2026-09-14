import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native';
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

export default function ServicePickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { companyId } = useAuth();
  const { locationId } = useLocation();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [servicesList, setServicesList] = React.useState<ServiceWithVariants[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    if (!companyId || !locationId) return;
    fetchServices(companyId, locationId)
      .then(setServicesList)
      .catch(() => setServicesList([]));
  }, [companyId, locationId]);

  const addService = React.useCallback(
    (service: ServiceWithVariants, variant: ServiceWithVariants['service_variant'][number]) => {
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
      router.back();
    },
    [staffId, router]
  );

  const filteredServices = servicesList.filter((service) => service.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.selectService'),
        }}
      />
      {servicesList.length === 0 ? (
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
              autoFocus
            />
          </View>
          {filteredServices.map((service) => {
            const single = service.service_variant.length === 1;
            const variant = single ? service.service_variant[0] : null;
            return (
              <Pressable
                key={service.id}
                style={styles.row}
                onPress={() => {
                  if (single && variant) {
                    addService(service, variant);
                    return;
                  }
                  router.push({ pathname: '/appointment-new/service-variants', params: { serviceId: service.id, staffId } });
                }}>
                <View style={[styles.swatch, { backgroundColor: COLOR_MAP[mapTreatmentColorToEventColor(service.color, service.name)] }]} />
                <View style={styles.flexFill}>
                  <Text style={styles.rowTitle}>{service.name}</Text>
                  <Text style={styles.rowMeta}>
                    {single && variant
                      ? `${variantDurationMinutes(variant)} ${t('appointment.minutesShort')} · €${variant.price}`
                      : t('appointment.optionsCount', { count: service.service_variant.length })}
                  </Text>
                </View>
                <View style={styles.plusButton}>
                  <AppIcon name={single ? 'add' : 'chevronRight'} size={18} color={theme.text} />
                </View>
              </Pressable>
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
