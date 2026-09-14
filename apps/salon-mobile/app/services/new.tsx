import { ScreenScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createService } from '@/lib/api/services';
import { COLOR_MAP, TREATMENT_COLORS, TreatmentColor } from '@/lib/treatment-colors';

export default function NewTreatmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState<string>(TREATMENT_COLORS[0]);
  const [saving, setSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!companyId || !canSave) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const service = await createService(companyId, { name: name.trim(), color, description: description.trim() });
      router.replace({ pathname: '/services/[id]', params: { id: service.id } });
    } catch {
      setErrorMessage(t('service.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('service.addNew'),
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
                <ActivityIndicator size="small" color={theme.text} />
              ) : (
                <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>{t('client.save')}</Text>
              )}
            </HeaderButton>
          ),
        }}
      />

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScreenScrollView contentContainerStyle={styles.form}>
        <TextInput style={styles.input} placeholder={t('service.name')} value={name} onChangeText={setName} />
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder={t('service.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
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
      </ScreenScrollView>
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 16,
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
    form: {
      padding: 16,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
      marginBottom: 8,
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
      marginBottom: 12,
    },
    multilineInput: {
      minHeight: 70,
      textAlignVertical: 'top',
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
  });
