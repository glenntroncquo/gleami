import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Pressable } from '@/components/pressable-scale';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors, Design } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [duplicateStatus, setDuplicateStatus] = React.useState<DuplicateStatus>('idle');
  const [duplicateMatch, setDuplicateMatch] = React.useState<ClientSearchResult | null>(null);

  const duplicateDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (duplicateDebounceRef.current) clearTimeout(duplicateDebounceRef.current);

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setDuplicateStatus('idle');
      setDuplicateMatch(null);
      return;
    }

    setDuplicateStatus('checking');
    duplicateDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchClients(trimmed);
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
  }, [email]);

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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('appointment.newClientTitle'),
          headerRight: () => (
            <HeaderButton onPress={handleSave} disabled={!canSave} hitSlop={8} style={styles.headerTextButton}>
              <Text style={[styles.headerSaveText, { color: canSave ? theme.tint : theme.muted }]}>{t('appointment.save')}</Text>
            </HeaderButton>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>{`${t('appointment.firstName')} *`}</Text>
          <TextInput style={styles.fieldInput} value={firstName} onChangeText={setFirstName} placeholderTextColor={theme.muted} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>{`${t('appointment.lastName')} *`}</Text>
          <TextInput style={styles.fieldInput} value={lastName} onChangeText={setLastName} placeholderTextColor={theme.muted} />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>{`${t('appointment.email')} *`}</Text>
          <TextInput
            style={styles.fieldInput}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={theme.muted}
          />
        </View>

        {duplicateStatus === 'checking' ? (
          <ActivityIndicator style={styles.inlineSpinner} color={theme.muted} />
        ) : duplicateStatus === 'clear' ? (
          <View style={[styles.duplicateBanner, styles.duplicateBannerClear]}>
            <AppIcon name="checkCircle" size={18} color={theme.text} />
            <View style={styles.flexFill}>
              <Text style={styles.duplicateBannerTitle}>{t('appointment.noDuplicateFound')}</Text>
              <Text style={styles.rowMeta}>{t('appointment.noDuplicateFoundHint')}</Text>
            </View>
          </View>
        ) : duplicateStatus === 'duplicate' && duplicateMatch ? (
          <View style={[styles.duplicateBanner, styles.duplicateBannerWarn]}>
            <View style={styles.flexFill}>
              <Text style={styles.duplicateBannerTitle}>{t('appointment.duplicateFound')}</Text>
              <Text style={styles.rowMeta}>{clientDisplayName(duplicateMatch.first_name, duplicateMatch.last_name, duplicateMatch.email)}</Text>
            </View>
            <Pressable onPress={useExistingClient}>
              <Text style={styles.headerLinkText}>{t('appointment.useExistingClient')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
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
    headerTextButton: {
      width: 'auto',
      minWidth: 0,
      paddingHorizontal: 4,
    },
    headerLinkText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.tint,
    },
    headerSaveText: {
      fontSize: 16,
      fontWeight: '700',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      gap: 16,
    },
    formGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.muted,
    },
    fieldInput: {
      minHeight: Design.touchTarget,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
    },
    inlineSpinner: {
      marginTop: 8,
    },
    rowMeta: {
      fontSize: 13,
      color: theme.muted,
      marginTop: 2,
    },
    duplicateBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      padding: 12,
    },
    duplicateBannerClear: {
      backgroundColor: `${theme.text}0F`,
    },
    duplicateBannerWarn: {
      backgroundColor: `${theme.error}1A`,
    },
    duplicateBannerTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
  });
}
