import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon, type AppIconName } from '@/components/app-icon';
import { ListGroup, ListRow, ScreenTitle, SectionHeader, useTheme } from '@/components/ui';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AccountDeletionButton } from '@/components/account-deletion-button';
import { SkeletonBlock } from '@/components/skeleton-block';
import { LegalLinkRows } from '@/components/legal-link-rows';
import { TabScreen } from '@/components/tab-screen';
import { ThemedView } from '@/components/themed-view';
import { Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemePreference, type ThemePreference } from '@/contexts/theme-context';
import type { PermissionKey } from '@/lib/auth/permissions';
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage, setLanguage } from '@/lib/i18n';
import { fetchOwnStaffProfile, StaffProfile } from '@/lib/api/profile';
import { getCompanyImageUrl, uploadStaffPhoto, removeStaffPhoto } from '@/lib/storage';
import { updateStaffImagePath } from '@/lib/api/staff';
import { getInitialsFromLabel } from '@/lib/text';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  nl: 'Nederlands',
  en: 'English',
  pt: 'Português',
};
const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

const MANAGE_ITEMS: { permission: PermissionKey; href: '/staff' | '/services' | '/orders' | '/products' | '/dashboard' | '/settings'; icon: AppIconName; labelKey: string }[] = [
  { permission: 'staff:manage', href: '/staff', icon: 'groups', labelKey: 'more.staff' },
  { permission: 'treatments:manage', href: '/services', icon: 'cut', labelKey: 'more.services' },
  { permission: 'orders:manage', href: '/orders', icon: 'orders', labelKey: 'more.orders' },
  { permission: 'products:manage', href: '/products', icon: 'inventory', labelKey: 'more.products' },
  { permission: 'dashboard:read', href: '/dashboard', icon: 'dashboard', labelKey: 'more.dashboard' },
  { permission: 'settings:manage', href: '/settings', icon: 'settings', labelKey: 'more.settings' },
];

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const { user, companyId, signOut, hasPermission } = useAuth();
  const [profile, setProfile] = React.useState<StaffProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const photoBusy = React.useRef(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [shouldCrash, setShouldCrash] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);

  if (__DEV__ && shouldCrash) {
    throw new Error('Sentry test render crash (__DEV__)');
  }

  const loadProfile = React.useCallback(async () => {
    if (!user || !companyId) {
      setProfileLoading(false);
      return;
    }
    try {
      const data = await fetchOwnStaffProfile(user.id, companyId);
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user, companyId]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleChangePhoto = async () => {
    if (!profile || !companyId || photoBusy.current) return;
    photoBusy.current = true;
    setUploadingPhoto(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('staff.photoPermissionRequired'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error('Missing photo data');
      const imagePath = await uploadStaffPhoto(companyId, profile.id, asset.base64);
      try {
        await updateStaffImagePath(profile.id, companyId, imagePath);
      } catch (error) {
        await removeStaffPhoto(companyId, imagePath).catch(() => {});
        throw error;
      }
      setProfile((current) => current?.id === profile.id ? { ...current, image_path: imagePath } : current);
      await removeStaffPhoto(companyId, profile.image_path).catch(() => {});
    } catch {
      Alert.alert(t('staff.photoUploadFailed'));
    } finally {
      photoBusy.current = false;
      setUploadingPhoto(false);
    }
  };

  const displayName =
    `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || user?.email || '';
  const avatarUrl = getCompanyImageUrl(profile?.image_path);

  const canManage = MANAGE_ITEMS.some((item) => hasPermission(item.permission));

  return (
    <TabScreen>
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
      <ScreenTitle title={t('tabs.more')} />

      <View style={styles.profileCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('staff.changePhoto')}
          accessibilityState={{ disabled: !profile || profileLoading || uploadingPhoto, busy: uploadingPhoto }}
          disabled={!profile || profileLoading || uploadingPhoto}
          onPress={handleChangePhoto}
          style={styles.avatarButton}>
          {profileLoading ? (
            <SkeletonBlock style={[styles.avatar, { backgroundColor: theme.border }]} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.blueTint, borderWidth: 1, borderColor: `${theme.brandBlue}40` }]}>
              <Text style={[styles.avatarInitials, { color: theme.text }]}>{getInitialsFromLabel(displayName)}</Text>
            </View>
          )}
          {profile && !profileLoading ? (
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
              <AppIcon name="camera" size={12} color={theme.onPrimary} />
            </View>
          ) : null}
        </Pressable>
        <View style={styles.profileText}>
          {displayName ? <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{displayName}</Text> : null}
          {user?.email && user.email !== displayName ? (
            <Text style={[styles.email, { color: theme.muted }]} numberOfLines={1}>{user.email}</Text>
          ) : null}
        </View>
      </View>

      {profile ? (
        <ListGroup>
          <ListRow
            icon="schedule"
            title={t('more.mySchedule')}
            onPress={() => router.push({ pathname: '/staff/[id]/availability', params: { id: profile.id } })}
          />
        </ListGroup>
      ) : null}

      {canManage ? (
        <View style={styles.section}>
          <SectionHeader title={t('more.manage')} />
          <ListGroup>
            {MANAGE_ITEMS.filter((item) => hasPermission(item.permission)).map((item) => (
              <ListRow key={item.href} icon={item.icon} title={t(item.labelKey)} onPress={() => router.push(item.href)} />
            ))}
          </ListGroup>
        </View>
      ) : null}

      <ListGroup>
        <ListRow
          icon="language"
          title={t('profile.language')}
          subtitle={LANGUAGE_LABELS[i18n.language as SupportedLanguage] ?? i18n.language}
          expanded={languageOpen}
          onPress={() => setLanguageOpen((open) => !open)}
          chevron={false}
          trailing={<AppIcon name={languageOpen ? 'expandMore' : 'chevronRight'} size={17} color={theme.muted} />}
        />
        {languageOpen ? SUPPORTED_LANGUAGES.map((language) => (
          <ListRow
            key={language}
            title={LANGUAGE_LABELS[language]}
            selected={i18n.language === language}
            onPress={() => {
              setLanguage(language);
              setLanguageOpen(false);
            }}
          />
        )) : null}
      </ListGroup>

      <ListGroup>
        <ListRow
          icon="appearance"
          title={t('settings.appearance')}
          subtitle={t(`settings.theme.${preference}`)}
          expanded={appearanceOpen}
          onPress={() => setAppearanceOpen((open) => !open)}
          chevron={false}
          trailing={<AppIcon name={appearanceOpen ? 'expandMore' : 'chevronRight'} size={17} color={theme.muted} />}
        />
        {appearanceOpen ? THEME_OPTIONS.map((option) => (
          <ListRow
            key={option}
            title={t(`settings.theme.${option}`)}
            selected={preference === option}
            onPress={() => {
              setPreference(option);
              setAppearanceOpen(false);
            }}
          />
        )) : null}
      </ListGroup>

      <View style={styles.section}>
        <LegalLinkRows />
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('account.section')} />
        <ListGroup>
          <ListRow icon="signOut" chevron={false} title={t('profile.signOut')} onPress={signOut} />
        </ListGroup>
        <ListGroup style={styles.deleteGroup}>
          {__DEV__ ? (
            <ListRow destructive icon="flash" chevron={false} title={t('errorBoundary.testCrash')} onPress={() => setShouldCrash(true)} />
          ) : null}
          <AccountDeletionButton />
        </ListGroup>
      </View>
      </ScrollView>
    </ThemedView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: Design.screenPadding,
    gap: 20,
  },
  section: { gap: 8 },
  deleteGroup: { marginTop: 8 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  avatarButton: { position: 'relative' },
  avatarEditBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 20, fontWeight: '700' },
  profileText: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  email: { fontSize: 14 },
});
