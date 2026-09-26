import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, type AuthUser } from '@/src/auth/auth-context';
import { PrimaryButton } from '@/src/components/auth/auth-ui';
import { SettingsGroup, SettingsRow } from '@/src/components/settings-list';
import { t } from '@/src/i18n';
import { brandColors } from '@/src/theme/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 104, paddingHorizontal: 20 }}>
      <Text className="text-3xl font-semibold tracking-tight text-ink">{t('profile.title')}</Text>
      {!auth.configured ? (
        <Text className="mt-4 text-sm leading-5 text-muted">{t('profile.missingConfig')}</Text>
      ) : auth.loading ? (
        <ActivityIndicator color={brandColors.navy} style={{ marginTop: 32 }} />
      ) : auth.user ? (
        <SignedIn user={auth.user} />
      ) : (
        <SignedOut />
      )}
    </ScrollView>
  );
}

function SignedOut() {
  return (
    <View>
      <Text style={styles.lead}>{t('profile.signedOutBody')}</Text>
      <View style={{ marginTop: 20 }}>
        <PrimaryButton label={t('profile.signIn')} onPress={() => router.push('/auth')} />
      </View>
      <View style={styles.rule} />
      <HelpAndLegal />
    </View>
  );
}

/** Support and legal, reachable whether or not someone is signed in. */
function HelpAndLegal() {
  return (
    <SettingsGroup>
      <SettingsRow
        icon="help-circle-outline"
        label={t('profile.help')}
        chevron
        onPress={() => router.push('/support')}
      />
      <SettingsRow
        icon="reader-outline"
        label={t('profile.legal')}
        chevron
        onPress={() => router.push('/legal')}
      />
    </SettingsGroup>
  );
}

function initials(user: AuthUser): string {
  const letters = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.trim();
  return (letters || user.email.charAt(0)).toUpperCase();
}

function SignedIn({ user }: { user: AuthUser }) {
  const auth = useAuth();
  const [deleting, setDeleting] = useState(false);
  const name = `${user.firstName} ${user.lastName}`.trim();

  const confirmDelete = () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeleting(true);
            const result = await auth.deleteAccount();
            setDeleting(false);
            if (result.error !== null) Alert.alert(t('profile.deleteAccount'), result.error);
            else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          })();
        },
      },
    ]);
  };

  return (
    <View style={{ marginTop: 24, gap: 16 }}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          {name ? <Text style={styles.name} numberOfLines={1}>{name}</Text> : null}
          <Text style={name ? styles.email : styles.name} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>

      {!user.profileComplete ? (
        <Pressable
          onPress={() => router.push({ pathname: '/auth/complete', params: { method: 'social' } })}
          accessibilityRole="button"
          accessibilityLabel={t('profile.finishTitle')}
          style={({ pressed }) => [styles.finish, pressed && { opacity: 0.85 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.finishTitle}>{t('profile.finishTitle')}</Text>
            <Text style={styles.finishBody}>{t('profile.finishBody')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={brandColors.navy} />
        </Pressable>
      ) : null}

      <SettingsGroup>
        <SettingsRow
          icon="heart-outline"
          label={t('favorites.title')}
          chevron
          onPress={() => router.push('/favorites')}
        />
      </SettingsGroup>

      <HelpAndLegal />

      <SettingsGroup>
        <SettingsRow
          icon="link-outline"
          label={t('profile.linkedAccounts')}
          chevron
          onPress={() => router.push('/account/linked-accounts')}
        />
        <SettingsRow
          icon="log-out-outline"
          label={t('profile.signOut')}
          onPress={() => {
            void auth.signOut();
          }}
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="trash-outline"
          label={t('profile.deleteAccount')}
          destructive
          busy={deleting}
          onPress={confirmDelete}
        />
      </SettingsGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: 6, fontSize: 15, lineHeight: 22, color: brandColors.muted },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: brandColors.line, marginVertical: 28 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: brandColors.blueTint,
    borderWidth: 1,
    borderColor: `${brandColors.blue}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: brandColors.navy },
  name: { fontSize: 18, fontWeight: '700', color: brandColors.navy, letterSpacing: -0.2 },
  email: { marginTop: 2, fontSize: 14, color: brandColors.muted },
  finish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: brandColors.blueTint,
    borderWidth: 1,
    borderColor: `${brandColors.lavender}40`,
  },
  finishTitle: { fontSize: 15, fontWeight: '700', color: brandColors.navy },
  finishBody: { marginTop: 2, fontSize: 13.5, color: brandColors.muted },
});
