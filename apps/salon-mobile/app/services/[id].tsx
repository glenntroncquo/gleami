import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import {
  Button,
  ErrorBanner,
  Field,
  FormScreen,
  ListGroup,
  ListRow,
  SectionHeader,
  SwitchRow,
  TextField,
} from '@/components/ui';
import { SwipeableRow } from '@/components/swipeable-row';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FormSkeleton } from '@/components/content-skeletons';
import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
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
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {screenOptions}
        <FormSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <>
      {screenOptions}
      <FormScreen
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={!name.trim()} />}>
        <ErrorBanner message={error} />

        <TextField label={t('service.name')} value={name} onChangeText={setName} placeholder={t('service.name')} />

        <TextField
          label={t('service.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('service.descriptionPlaceholder')}
          multiline
        />

        <Field label={t('service.color')}>
          <View style={styles.colorRow}>
            {TREATMENT_COLORS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: color === option }}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: COLOR_MAP[option as TreatmentColor] },
                  color === option && styles.colorSwatchSelected,
                ]}
                onPress={() => setColor(option)}>
                {color === option ? <AppIcon name="check" size={16} color={theme.onTint} /> : null}
              </Pressable>
            ))}
          </View>
        </Field>

        <ListGroup>
          <SwitchRow title={t('service.active')} value={isActive} onValueChange={setIsActive} />
        </ListGroup>

        <View>
          <SectionHeader title={t('service.variants')} />
          {variants.length === 0 ? (
            <EmptyState
              compact
              title={t('service.noVariants')}
              subtitle={t('service.noVariantsHint')}
            />
          ) : (
            <ListGroup inset={14}>
              {variants.map((option) => (
                <SwipeableRow key={option.id} onDelete={() => handleDeleteOption(option)} deleteLabel={t('common.delete')}>
                  <ListRow
                    title={option.name}
                    subtitle={formatVariantSubtitle(option, t)}
                    onPress={() => openEditOption(option)}
                  />
                </SwipeableRow>
              ))}
            </ListGroup>
          )}
          <Button
            label={t('service.addVariant')}
            icon="add"
            variant="secondary"
            size="medium"
            onPress={openAddOption}
            style={styles.addButton}
          />
        </View>
      </FormScreen>
    </>
  );
}

const createStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    colorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
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
    addButton: {
      marginTop: 12,
    },
  });
