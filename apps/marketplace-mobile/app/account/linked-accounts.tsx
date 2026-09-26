import Ionicons from '@expo/vector-icons/Ionicons';
import type { UserIdentity } from '@supabase/supabase-js';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/auth/auth-context';
import { isSocialAvailable, providerLabel, type SocialProvider } from '@/src/auth/social';
import { authColors } from '@/src/components/auth/auth-ui';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

const SOCIAL: SocialProvider[] = ['apple', 'google'];

export default function LinkedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [available, setAvailable] = useState<Record<SocialProvider, boolean>>({ apple: false, google: false });
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const { listIdentities, user } = auth;
  const load = useCallback(
    () => listIdentities().then(setIdentities, () => setIdentities([])),
    [listIdentities],
  );

  useEffect(() => {
    if (!user) {
      router.back();
      return;
    }
    listIdentities().then(setIdentities, () => setIdentities([]));
  }, [user, listIdentities]);

  useEffect(() => {
    void Promise.all(SOCIAL.map(isSocialAvailable)).then(([apple, google]) => setAvailable({ apple, google }));
  }, []);

  const identityFor = (provider: string) => identities?.find((item) => item.provider === provider);

  const link = async (provider: SocialProvider) => {
    setMessage(null);
    setBusy(provider);
    const result = await auth.linkSocial(provider);
    setBusy(null);
    if (result.error !== null) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMessage({ tone: 'error', text: result.error });
      return;
    }
    if (!result.data) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMessage({ tone: 'ok', text: t('account.linkedToast', { provider: providerLabel[provider] }) });
    await load();
  };

  const unlink = (provider: SocialProvider) => {
    if ((identities?.length ?? 0) < 2) {
      setMessage({ tone: 'error', text: t('account.lastMethod') });
      return;
    }
    const label = providerLabel[provider];
    Alert.alert(t('account.unlinkTitle', { provider: label }), t('account.unlinkBody', { provider: label }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('account.unlink'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setMessage(null);
            setBusy(provider);
            const result = await auth.unlinkSocial(provider);
            setBusy(null);
            if (result.error !== null) {
              setMessage({ tone: 'error', text: result.error });
              return;
            }
            void Haptics.selectionAsync();
            await load();
          })();
        },
      },
    ]);
  };

  const emailIdentity = identityFor('email');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}>
          <Ionicons name="arrow-back" size={26} color={authColors.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('account.linkedTitle')}
        </Text>
        <Text style={styles.subtitle}>{t('account.linkedBody')}</Text>

        {identities === null ? (
          <ActivityIndicator color={brandColors.navy} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.group}>
            <ProviderRow
              icon={<Ionicons name="mail-outline" size={21} color={brandColors.navy} />}
              title={t('account.emailPassword')}
              detail={emailIdentity ? auth.user?.email ?? '' : t('account.notLinked')}
              linked={Boolean(emailIdentity)}
            />
            {SOCIAL.filter((provider) => available[provider] || identityFor(provider)).map((provider) => {
              const identity = identityFor(provider);
              const email = identity?.identity_data?.email as string | undefined;
              return (
                <React.Fragment key={provider}>
                  <View style={styles.separator} />
                  <ProviderRow
                    icon={
                      provider === 'apple' ? (
                        <Ionicons name="logo-apple" size={22} color="#000000" />
                      ) : (
                        <Image source={require('@/assets/google-g.svg')} style={{ width: 20, height: 20 }} />
                      )
                    }
                    title={providerLabel[provider]}
                    detail={identity ? email || t('account.linked') : t('account.notLinked')}
                    linked={Boolean(identity)}
                    action={identity ? t('account.unlink') : t('account.link')}
                    busy={busy === provider}
                    disabled={busy !== null}
                    onAction={() => (identity ? unlink(provider) : void link(provider))}
                  />
                </React.Fragment>
              );
            })}
          </View>
        )}

        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.message, { color: message.tone === 'error' ? authColors.danger : brandColors.navy }]}>
            {message.text}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ProviderRow({
  icon,
  title,
  detail,
  linked,
  action,
  busy,
  disabled,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  linked: boolean;
  action?: string;
  busy?: boolean;
  disabled?: boolean;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <View style={styles.status}>
          {linked ? <Ionicons name="checkmark-circle" size={14} color={brandColors.lavender} /> : null}
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        </View>
      </View>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${action} ${title}`}
          style={({ pressed }) => [
            styles.action,
            linked ? styles.actionSecondary : styles.actionPrimary,
            (pressed || (disabled && !busy)) && { opacity: 0.6 },
          ]}>
          {busy ? (
            <ActivityIndicator size="small" color={linked ? brandColors.navy : '#ffffff'} />
          ) : (
            <Text style={[styles.actionLabel, { color: linked ? brandColors.navy : '#ffffff' }]}>{action}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  header: { height: 52, justifyContent: 'center', paddingHorizontal: 14 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 6, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4, color: authColors.ink },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: authColors.muted },
  group: {
    marginTop: 24,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: brandColors.line,
    overflow: 'hidden',
  },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brandColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15.5, fontWeight: '600', color: brandColors.navy },
  status: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDetail: { flexShrink: 1, fontSize: 13.5, color: brandColors.muted },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 70, backgroundColor: brandColors.line },
  action: { minWidth: 96, height: 36, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionPrimary: { backgroundColor: brandColors.navy },
  actionSecondary: { borderWidth: 1, borderColor: brandColors.line, backgroundColor: '#ffffff' },
  actionLabel: { fontSize: 14, fontWeight: '600' },
  message: { marginTop: 14, fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
});
