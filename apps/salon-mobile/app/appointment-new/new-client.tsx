import { AppIcon } from '@/components/app-icon';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RowListSkeleton } from '@/components/content-skeletons';
import { Button, FieldRow, FormScreen, TextField, useModalHeader, useTheme } from '@/components/ui';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ClientSearchResult, searchClients } from '@/lib/api/clients';

import { APPOINTMENT_DRAFT_EVENTS } from '@/lib/appointment-draft';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
type DuplicateStatus = 'idle' | 'checking' | 'clear' | 'duplicate';

function clientDisplayName(first: string | null | undefined, last: string | null | undefined, fallback: string) {
  return `${first ?? ''} ${last ?? ''}`.trim() || fallback;
}

export default function NewClientScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { companyId } = useAuth();
  const theme = useTheme();
  const modalHeader = useModalHeader();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [duplicateStatus, setDuplicateStatus] = React.useState<DuplicateStatus>('idle');
  const [duplicateMatch, setDuplicateMatch] = React.useState<ClientSearchResult | null>(null);

  const duplicateDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current);

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed) || !companyId) {
      setDuplicateStatus('idle');
      setDuplicateMatch(null);
      return;
    }

    setDuplicateStatus('checking');
    duplicateDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchClients(trimmed, companyId);
        const match = results.find((r) => r.email.toLowerCase() === trimmed.toLowerCase()) ?? null;
        setDuplicateMatch(match);
        setDuplicateStatus(match ? 'duplicate' : 'clear');
      } catch {
        setDuplicateStatus('idle');
        setDuplicateMatch(null);
      }
    }, 450);

    return () => {
      if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current);
    };
  }, [email, companyId]);

  const canSave = firstName.trim().length > 0 && EMAIL_PATTERN.test(email.trim());

  const handleSave = React.useCallback(() => {
    if (!canSave) return;
    Haptics.selectionAsync();
    DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.selectNewClient, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });
    router.dismissTo('/appointment-new');
  }, [canSave, firstName, lastName, email, router]);

  const useExistingClient = React.useCallback(() => {
    if (!duplicateMatch) return;
    Haptics.selectionAsync();
    DeviceEventEmitter.emit(APPOINTMENT_DRAFT_EVENTS.selectClient, duplicateMatch);
    router.dismissTo('/appointment-new');
  }, [duplicateMatch, router]);

  return (
    <>
      <Stack.Screen options={modalHeader} />
      <FormScreen
        closable
        title={t('appointment.newClientTitle')}
        footer={<Button label={t('appointment.save')} onPress={handleSave} disabled={!canSave} />}>
        <FieldRow>
          <TextField
            label={t('appointment.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            textContentType="givenName"
          />
          <TextField
            label={t('appointment.lastName')}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            textContentType="familyName"
          />
        </FieldRow>
        <TextField
          label={t('appointment.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        {duplicateStatus === 'checking' ? (
          <RowListSkeleton count={1} avatar={false} style={styles.skeleton} />
        ) : duplicateStatus === 'clear' ? (
          <View style={[styles.banner, { backgroundColor: theme.successSurface }]}>
            <AppIcon name="checkCircle" size={18} color={theme.success} />
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: theme.text }]}>{t('appointment.noDuplicateFound')}</Text>
              <Text style={[styles.bannerMeta, { color: theme.muted }]}>{t('appointment.noDuplicateFoundHint')}</Text>
            </View>
          </View>
        ) : duplicateStatus === 'duplicate' && duplicateMatch ? (
          <View style={[styles.banner, styles.bannerColumn, { backgroundColor: theme.warningSurface }]}>
            <View style={styles.bannerHeading}>
              <AppIcon name="person" size={18} color={theme.warning} />
              <View style={styles.flex}>
                <Text style={[styles.bannerTitle, { color: theme.text }]}>{t('appointment.duplicateFound')}</Text>
                <Text style={[styles.bannerMeta, { color: theme.muted }]}>
                  {clientDisplayName(duplicateMatch.first_name, duplicateMatch.last_name, duplicateMatch.email)}
                </Text>
              </View>
            </View>
            <Button label={t('appointment.useExistingClient')} variant="secondary" size="medium" onPress={useExistingClient} />
          </View>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skeleton: { paddingHorizontal: 0, paddingTop: 0 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Design.controlRadius, padding: 14 },
  bannerColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  bannerHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { fontSize: 14, fontWeight: '600' },
  bannerMeta: { fontSize: 13, marginTop: 2 },
});
