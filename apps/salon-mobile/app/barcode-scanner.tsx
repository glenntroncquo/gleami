import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { DeviceEventEmitter, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const SCANNED_BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'qr',
] as const;

/**
 * Shared full-screen barcode scanner, presented modally (see app/_layout.tsx).
 * Any screen can push this with an `event` name of its own; it emits
 * `{ code }` on the first successful scan and pops itself, mirroring the
 * date-time-picker's DeviceEventEmitter handoff pattern.
 */
export default function BarcodeScannerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { event, title } = useLocalSearchParams<{ event: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = React.useState(false);
  const hasScannedRef = React.useRef(false);

  const handleBarcodeScanned = React.useCallback(
    (result: BarcodeScanningResult) => {
      if (hasScannedRef.current) return;
      const code = result.data?.trim();
      if (!code) return;
      hasScannedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      DeviceEventEmitter.emit(event, { code });
      router.back();
    },
    [event, router]
  );

  const permissionGranted = permission?.granted ?? false;
  const canAskAgain = permission?.canAskAgain ?? true;

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && permission.status !== 'denied') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      {/* Matches the native Camera app: full-bleed capture surface with no status bar. */}
      <StatusBar hidden style="light" animated />

      {permissionGranted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: [...SCANNED_BARCODE_TYPES] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      ) : (
        <View style={styles.permissionFallback}>
          <EmptyState
            icon="barcode"
            title={t('barcodeScanner.permissionTitle')}
            subtitle={canAskAgain ? t('barcodeScanner.permissionSubtitle') : t('barcodeScanner.permissionDeniedSubtitle')}
            actionLabel={canAskAgain ? t('barcodeScanner.grantAccess') : t('barcodeScanner.openSettings')}
            onAction={() => (canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
      )}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Pressable accessibilityRole="button" style={styles.iconButton} onPress={() => router.back()}>
            <AppIcon name="close" size={20} color="#ffffff" />
          </Pressable>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {permissionGranted ? (
            <Pressable
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={() => setTorchOn((current) => !current)}>
              <AppIcon name="flash" size={20} color={torchOn ? '#ffd60a' : '#ffffff'} />
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        {permissionGranted ? (
          <View style={[styles.frameWrap, { paddingBottom: insets.bottom + 60 }]} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>{t('barcodeScanner.hint')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  frame: {
    width: 260,
    height: 160,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  hint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
