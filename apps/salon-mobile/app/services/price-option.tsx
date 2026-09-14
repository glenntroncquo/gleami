import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import {
  PhaseBlockEditor,
  defaultEditorPhases,
  editorPhasesFromDrafts,
  type EditorPhase,
} from '@/components/phase-block-editor';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createServiceVariant,
  fetchService,
  phasesForEditor,
  updateServiceVariant,
} from '@/lib/api/services';

export default function PriceOptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    serviceId: string;
    optionId?: string;
    name?: string;
    price?: string;
  }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const isEditing = Boolean(params.optionId);
  const [poName, setPoName] = React.useState(params.name ?? '');
  const [poPrice, setPoPrice] = React.useState(params.price ?? '');
  const [phases, setPhases] = React.useState<EditorPhase[]>(defaultEditorPhases);
  const [serviceColor, setServiceColor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!params.serviceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchService(params.serviceId)
      .then((service) => {
        if (cancelled) return;
        setServiceColor(service?.color ?? null);
        if (params.optionId) {
          const variant = service?.service_variant.find((item) => item.id === params.optionId);
          if (variant) {
            setPoName(variant.name);
            setPoPrice(String(variant.price));
            setPhases(editorPhasesFromDrafts(phasesForEditor(variant)));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('service.failedToLoad'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.serviceId, params.optionId, t]);

  const hasBusy = phases.some((phase) => phase.phase_type === 'busy');
  const canSave = poName.trim().length > 0 && hasBusy && !saving && !loading;

  const handleSave = async () => {
    if (!params.serviceId || !companyId || !poName.trim() || !hasBusy) {
      if (!hasBusy) setError(t('service.keepOneBusy'));
      return;
    }
    const price = Number(poPrice);
    if (!Number.isFinite(price)) {
      setError(t('service.failedToSaveOption'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: poName.trim(),
        price,
        phases: phases.map((phase) => ({
          phase_type: phase.phase_type,
          duration_minutes: phase.duration_minutes,
        })),
      };
      if (params.optionId) {
        await updateServiceVariant(params.optionId, companyId, payload);
      } else {
        await createServiceVariant(params.serviceId, companyId, payload);
      }
      router.back();
    } catch {
      setError(t('service.failedToSaveOption'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditing ? t('service.editVariant') : t('service.addVariant'),
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: t('common.close'),
              icon: { type: 'sfSymbol', name: 'xmark' },
              tintColor: theme.text,
              onPress: () => router.back(),
            },
          ],
          headerLeft: () => (
            <HeaderButton onPress={() => router.back()} hitSlop={8}>
              <AppIcon name="close" size={18} color={theme.text} />
            </HeaderButton>
          ),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8}>
              {saving ? (
                <ActivityIndicator size="small" color={theme.tint} />
              ) : (
                <Text style={[styles.saveText, { color: canSave ? theme.tint : theme.muted }]}>{t('client.save')}</Text>
              )}
            </HeaderButton>
          ),
        }}
      />

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: `${theme.error}22` }]}>
          <Text style={[styles.errorBannerText, { color: theme.error }]}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder={t('service.optionName')}
              placeholderTextColor={theme.muted}
              value={poName}
              onChangeText={setPoName}
            />
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder={t('service.price')}
              placeholderTextColor={theme.muted}
              value={poPrice}
              onChangeText={setPoPrice}
              keyboardType="decimal-pad"
            />
            <PhaseBlockEditor phases={phases} onChange={setPhases} serviceColor={serviceColor} theme={theme} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: Design.controlRadius,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    paddingBottom: 48,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
});
