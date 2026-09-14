import { ScreenScrollView as ScrollView } from '@/components/screen-scroll-view';
import { Pressable } from '@/components/pressable-scale';
import { AppIcon } from '@/components/app-icon';
import { HeaderButton } from '@/components/header-button';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { StaffAvatar } from '@/components/staff-avatar';
import { Colors, Design } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchStaffMember, Staff, updateStaff, updateStaffImagePath } from '@/lib/api/staff';
import { uploadStaffPhoto, removeStaffPhoto } from '@/lib/storage';

export default function StaffDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { companyId } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const styles = createStyles(theme);

  const [staff, setStaff] = React.useState<Staff | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [specialization, setSpecialization] = React.useState('');
  const [status, setStatus] = React.useState('');

  const load = React.useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchStaffMember(id);
      setStaff(data);
      if (data) {
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setSpecialization(data.specialization ?? '');
        setStatus(data.status ?? '');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!id || !email.trim()) return;
    setSaving(true);
    try {
      await updateStaff(id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        status: status.trim(),
      });
      router.back();
    } catch {
      setError(t('staff.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const photoBusy = React.useRef(false);
  const handleChangePhoto = async () => {
    if (!id || !companyId || !staff || photoBusy.current) return;
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
      const imagePath = await uploadStaffPhoto(companyId, id, asset.base64);
      try {
        await updateStaffImagePath(id, companyId, imagePath);
      } catch (error) {
        await removeStaffPhoto(companyId, imagePath).catch(() => {});
        throw error;
      }
      setStaff((prev) => (prev ? { ...prev, image_path: imagePath } : prev));
      setError(null);
      await removeStaffPhoto(companyId, staff.image_path).catch(() => {});
    } catch {
      setError(t('staff.photoUploadFailed'));
    } finally {
      photoBusy.current = false;
      setUploadingPhoto(false);
    }
  };

  const name = `${firstName} ${lastName}`.trim() || staff?.email || '';

  const screenOptions = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: name || t('staff.title'),
        headerRight: () => (
          <HeaderButton onPress={handleSave} disabled={saving || !email.trim()} hitSlop={8}>
            {saving ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <Text style={[styles.saveText, !email.trim() && styles.saveTextDisabled]}>{t('client.save')}</Text>
            )}
          </HeaderButton>
        ),
      }}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        {screenOptions}
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      {screenOptions}

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.profileSection}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('staff.changePhoto')} style={styles.avatarPressable} onPress={handleChangePhoto} disabled={uploadingPhoto}>
            <StaffAvatar imagePath={staff?.image_path} name={name} size={72} fontSize={24} />
            <View style={styles.avatarEditBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <AppIcon name="camera" size={14} color={theme.background} />
              )}
            </View>
          </Pressable>
          <Pressable onPress={handleChangePhoto} disabled={uploadingPhoto} hitSlop={8}>
            <Text style={styles.changePhotoText}>{t('staff.changePhoto')}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <TextInput style={styles.input} placeholder={t('client.firstName')} value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder={t('client.lastName')} value={lastName} onChangeText={setLastName} />
          <TextInput
            style={styles.input}
            placeholder={t('client.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('client.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder={t('staff.specialization')}
            value={specialization}
            onChangeText={setSpecialization}
          />
          <TextInput style={styles.input} placeholder={t('staff.status')} value={status} onChangeText={setStatus} />
        </View>

        <View style={styles.section}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push({ pathname: '/staff/[id]/availability', params: { id } })}>
            <Text style={styles.navRowText}>{t('staff.availability')}</Text>
            <AppIcon name="chevronRight" size={20} color={theme.muted} />
          </Pressable>
          <Pressable style={styles.navRow} onPress={() => router.push({ pathname: '/staff/[id]/time-off', params: { id } })}>
            <Text style={styles.navRowText}>{t('staff.timeOff')}</Text>
            <AppIcon name="chevronRight" size={20} color={theme.muted} />
          </Pressable>
          <Pressable style={styles.navRow} onPress={() => router.push({ pathname: '/staff/[id]/schedule', params: { id } })}>
            <Text style={styles.navRowText}>{t('staff.schedule')}</Text>
            <AppIcon name="chevronRight" size={20} color={theme.muted} />
          </Pressable>
        </View>
      </ScrollView>
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
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    saveText: {
      fontSize: 15,
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
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 48,
      gap: 24,
    },
    profileSection: {
      alignItems: 'center',
      gap: 8,
    },
    avatarPressable: {
      position: 'relative',
    },
    avatarEditBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.tint,
      borderWidth: 2,
      borderColor: theme.background,
    },
    changePhotoText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.tint,
    },
    section: {
      gap: 10,
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
      marginBottom: 8,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
    },
    navRowText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
  });
