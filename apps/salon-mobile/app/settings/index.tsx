import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { HeaderButton } from '@/components/header-button';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AccountDeletionButton } from '@/components/account-deletion-button';
import { FormSkeleton } from '@/components/content-skeletons';
import { LegalLinkRows } from '@/components/legal-link-rows';
import { ErrorBanner, FieldRow, ListGroup, ListRow, SectionHeader, TextField, useTheme, type Theme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ThemePreference, useThemePreference } from '@/contexts/theme-context';
import { fetchCompany, updateCompany } from '@/lib/api/company';

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const theme = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [city, setCity] = React.useState('');
  const [postalCode, setPostalCode] = React.useState('');
  const [state, setState] = React.useState('');
  const [country, setCountry] = React.useState('');

  React.useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    fetchCompany(companyId)
      .then((data) => {
        if (data) {
          setName(data.name ?? '');
          setEmail(data.email ?? '');
          setDescription(data.description ?? '');
          setStreet(data.street ?? '');
          setCity(data.city ?? '');
          setPostalCode(data.postal_code ?? '');
          setState(data.state ?? '');
          setCountry(data.country ?? '');
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('settings.failedToLoad')))
      .finally(() => setLoading(false));
  }, [companyId, t]);

  const handleSave = async () => {
    if (!companyId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateCompany(companyId, {
        name: name.trim(),
        email: email.trim(),
        description: description.trim(),
        street: street.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        state: state.trim(),
        country: country.trim(),
      });
      router.back();
    } catch {
      setError(t('settings.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const showNoCompanyState = !loading && !companyId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings.title'),
          headerRight: () =>
            !showNoCompanyState ? (
              <HeaderButton onPress={handleSave} disabled={saving || !name.trim()} hitSlop={8} style={styles.headerTextButton}>
                <Text style={[styles.saveText, !name.trim() && styles.saveTextDisabled]}>{t('client.save')}</Text>
              </HeaderButton>
            ) : undefined,
        }}
      />

      {loading ? (
        <FormSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error} />

          {!showNoCompanyState ? (
            <View style={styles.section}>
              <SectionHeader title={t('settings.company')} />
              <View style={styles.fields}>
                <TextField label={t('settings.name')} value={name} onChangeText={setName} />
                <TextField
                  label={t('client.email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextField label={t('settings.description')} value={description} onChangeText={setDescription} multiline />
                <TextField label={t('settings.street')} value={street} onChangeText={setStreet} />
                <FieldRow>
                  <TextField containerStyle={styles.flex} label={t('settings.postalCode')} value={postalCode} onChangeText={setPostalCode} />
                  <TextField containerStyle={styles.flex} label={t('settings.city')} value={city} onChangeText={setCity} />
                </FieldRow>
                <FieldRow>
                  <TextField containerStyle={styles.flex} label={t('settings.state')} value={state} onChangeText={setState} />
                  <TextField containerStyle={styles.flex} label={t('settings.country')} value={country} onChangeText={setCountry} />
                </FieldRow>
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title={t('settings.appearance')} />
            <ListGroup inset={14}>
              {THEME_OPTIONS.map((option) => (
                <ListRow
                  key={option}
                  title={t(`settings.theme.${option}`)}
                  selected={preference === option}
                  onPress={() => setPreference(option)}
                />
              ))}
            </ListGroup>
          </View>

          <View style={styles.section}>
            <LegalLinkRows />
          </View>

          <View style={styles.section}>
            <SectionHeader title={t('account.section')} />
            <ListGroup>
              <AccountDeletionButton />
            </ListGroup>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.tint,
    },
    saveTextDisabled: {
      color: theme.muted,
    },
    scrollContent: {
      paddingHorizontal: Design.screenPadding,
      paddingTop: 16,
      paddingBottom: 48,
      gap: 24,
    },
    section: { gap: 8 },
    fields: { gap: 16 },
    flex: { flex: 1 },
  });
