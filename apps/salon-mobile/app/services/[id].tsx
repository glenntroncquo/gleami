import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { SwipeableRow } from '@/components/swipeable-row';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/empty-state';
import { Colors, Design } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ManagedService,
  ServiceVariant,
  deleteServiceVariant,
  fetchService,
  updateService,
  variantDurationMinutes,
  variantStaffDurationMinutes,
} from '@/lib/api/services';
import { COLOR_MAP, TREATMENT_COLORS, TreatmentColor } from '@/lib/treatment-colors';

function formatVariantSubtitle(
  option: ServiceVariant,
  t: (key: string) => string
): string {
  const clientMinutes = variantDurationMinutes(option);
  const staffMinutes = variantStaffDurationMinutes(option);
  const duration =
    staffMinutes > 0 && staffMinutes !== clientMinutes
      ? `${clientMinutes} ${t('appointment.minutesShort')} · ${staffMinutes} ${t('appointment.minutesShort')}`
      : `${clientMinutes} ${t('appointment.minutesShort')}`;
  return `${duration} · €${option.price}`;
}

export default function TreatmentDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [service, setService] = React.useState<ManagedService | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState<string>(TREATMENT_COLORS[0]);
  const [isActive, setIsActive] = React.useState(true);

  const [variants, setVariants] = React.useState<ServiceVariant[]>([]);

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchService(id);
      setService(data);
      if (data) {
        setName(data.name);
        setDescription(data.description ?? '');
        setColor(data.color ?? TREATMENT_COLORS[0]);
        setIsActive(Boolean(data.is_active));
        setVariants(data.service_variant ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('service.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const handleSave = async () => {
    if (!id || !name.trim()) return;
    setSaving(true);
    try {
      await updateService(id, { name: name.trim(), description, color, isActive });
      router.back();
    } catch {
      setError(t('service.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const openAddOption = () => {
    router.push({ pathname: '/services/price-option', params: { serviceId: id } });
  };

  const openEditOption = (option: ServiceVariant) => {
    router.push({
      pathname: '/services/price-option',
      params: {
        serviceId: id,
        optionId: option.id,
        name: option.name,
        price: String(option.price),
      },
    });
  };

  const handleDeleteOption = async (option: ServiceVariant) => {
    try {
      await deleteServiceVariant(option.id);
      setVariants((prev) => prev.filter((item) => item.id !== option.id));
    } catch {
      setError(t('service.failedToDeleteOption'));
    }
  };

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: service?.name || t('service.title'),
        headerRight: () => (
          <HeaderButton onPress={handleSave} disabled={saving || !name.trim()} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>{t('client.save')}</Text>
            )}
          </HeaderButton>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {screenOptions}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      {screenOptions}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('service.name')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('service.name')} />

          <Text style={styles.sectionLabel}>{t('service.description')}</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('service.descriptionPlaceholder')}
            multiline
          />

          <Text style={styles.sectionLabel}>{t('service.color')}</Text>
          <View style={styles.colorRow}>
            {TREATMENT_COLORS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: COLOR_MAP[option as TreatmentColor] },
                  color === option && styles.colorSwatchSelected,
                ]}
                onPress={() => setColor(option)}>
                {color === option ? <AppIcon name="check" size={16} color="#ffffff" /> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.activeRow}>
            <Text style={styles.sectionLabel}>{t('service.active')}</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('service.variants')}</Text>
          {variants.length === 0 ? (
            <EmptyState
              compact
              title={t('service.noVariants')}
              subtitle={t('service.noVariantsHint')}
            />
          ) : (
            variants.map((option) => (
              <SwipeableRow key={option.id} onDelete={() => handleDeleteOption(option)} deleteLabel={t('common.delete')}>
                <Pressable style={styles.optionRow} onPress={() => openEditOption(option)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>{option.name}</Text>
                    <Text style={styles.optionSubtitle}>{formatVariantSubtitle(option, t)}</Text>
                  </View>
                </Pressable>
              </SwipeableRow>
            ))
          )}
          <Pressable style={{ marginTop: 8 }} onPress={openAddOption}>
            <Text style={styles.addLink}>{t('service.addVariant')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.tint,
    },
    saveTextDisabled: {
      color: theme.muted,
    },
    errorBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: Design.controlRadius,
      backgroundColor: theme.errorSurface,
    },
    errorBannerText: {
      color: theme.error,
      fontSize: 13,
      fontWeight: '600',
    },
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
      gap: 24,
    },
    section: {
      gap: 10,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      marginBottom: 8,
    },
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 8,
    },
    colorSwatch: {
      width: 44,
      minHeight: 44,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorSwatchSelected: {
      borderWidth: 2,
      borderColor: theme.text,
    },
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
    },
    addLink: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.tint,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    optionName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    optionSubtitle: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
  });
