import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth, type AuthUser } from '@/src/auth/auth-context';
import { authColors, PrimaryButton } from '@/src/components/auth/auth-ui';
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
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <Ionicons name="person-outline" size={26} color={brandColors.navy} />
      </View>
      <Text style={styles.heroTitle}>{t('profile.signedOutTitle')}</Text>
      <Text style={styles.heroBody}>{t('profile.signedOutBody')}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
        <PrimaryButton label={t('profile.signIn')} onPress={() => router.push('/auth')} />
      </View>
    </View>
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

      <View style={styles.group}>
        <Row
          icon="link-outline"
          label={t('profile.linkedAccounts')}
          chevron
          onPress={() => router.push('/account/linked-accounts')}
        />
        <View style={styles.separator} />
        <Row
          icon="log-out-outline"
          label={t('profile.signOut')}
          onPress={() => {
            void auth.signOut();
          }}
        />
      </View>

      <View style={styles.group}>
        <Row
          icon="trash-outline"
          label={t('profile.deleteAccount')}
          destructive
          busy={deleting}
          onPress={confirmDelete}
        />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  destructive,
  busy,
  chevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  busy?: boolean;
  chevron?: boolean;
}) {
  const color = destructive ? authColors.danger : brandColors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#EEF0F6' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {busy ? (
        <ActivityIndicator color={color} />
      ) : !chevron ? null : (
        <Ionicons name="chevron-forward" size={17} color={brandColors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 40, alignItems: 'center', paddingHorizontal: 8 },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brandColors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { marginTop: 16, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, color: brandColors.navy, textAlign: 'center' },
  heroBody: { marginTop: 8, fontSize: 14, lineHeight: 20, color: brandColors.muted, textAlign: 'center' },
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
  group: { borderRadius: 20, borderCurve: 'continuous', backgroundColor: brandColors.surface, overflow: 'hidden' },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontSize: 15.5, fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 48, backgroundColor: brandColors.line },
});
