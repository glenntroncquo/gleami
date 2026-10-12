import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/app-icon';
import { Pressable } from '@/components/pressable-scale';
import { Button, ErrorBanner, Field, FormScreen, TextField, useModalHeader, useTheme } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { createService } from '@/lib/api/services';
import { COLOR_MAP, TREATMENT_COLORS, TreatmentColor } from '@/lib/treatment-colors';

export default function NewTreatmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const theme = useTheme();
  const modalHeader = useModalHeader();

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
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('service.addNew')}
        footer={<Button label={t('client.save')} onPress={handleSave} loading={saving} disabled={!canSave} />}>
        <ErrorBanner message={errorMessage} />
        <TextField label={t('service.name')} value={name} onChangeText={setName} autoCapitalize="sentences" />
        <TextField
          label={t('service.description')}
          placeholder={t('service.descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Field label={t('service.color')}>
          <View style={styles.colorRow}>
            {TREATMENT_COLORS.map((option) => {
              const selected = color === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: COLOR_MAP[option as TreatmentColor], borderColor: selected ? theme.text : 'transparent' },
                  ]}
                  onPress={() => setColor(option)}>
                  {selected ? <AppIcon name="check" size={16} color={theme.onTint} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Field>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
