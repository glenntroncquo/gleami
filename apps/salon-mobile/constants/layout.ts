import { Platform } from 'react-native';

/**
 * `NativeTabs` doesn't expose its rendered height to JS (Expo's own docs:
 * "layout function forthcoming"), so this is an estimate, not a
 * measurement. On iOS 26 the Liquid Glass tab bar floats with extra inset
 * above the true bottom edge — taller than the classic 49pt edge-to-edge
 * bar — so this runs a bit more generous to avoid content sitting under it.
 * Add `useSafeAreaInsets().bottom` on top of this for the full clearance.
 */
export const ESTIMATED_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 64 : 56;
