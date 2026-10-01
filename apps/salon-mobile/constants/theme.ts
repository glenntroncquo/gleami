/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Keep the staff app on the same visual foundation as marketplace-mobile.
// Dark mode preserves the same Gleami brand hierarchy with accessible contrast.
const textLight = '#071D43';
const textDark = '#F4F6FB';

export const Colors = {
  light: {
    text: textLight,
    background: '#fff',
    surface: '#F7F8FC',
    border: '#E5E9F2',
    muted: '#737989',
    blueTint: '#F0F3FC',
    brandBlue: '#6488E8',
    error: '#E5484D',
    errorSurface: '#FCEDEE',
    success: '#2E9E5B',
    successSurface: '#E7F6EC',
    warning: '#B8860B',
    warningSurface: '#FCF3D9',
    destructive: '#E85D58',
    onDestructive: '#FFFFFF',
    tint: '#071D43',
    onTint: '#FFFFFF',
    icon: '#737989',
    tabIconDefault: '#737989',
    tabIconSelected: '#071D43',
  },
  dark: {
    text: textDark,
    background: '#07111F',
    surface: '#111A2B',
    border: '#27344A',
    muted: '#A7B0C0',
    blueTint: '#1A2945',
    brandBlue: '#8FAAFF',
    error: '#FF6B6B',
    errorSurface: '#301719',
    success: '#4FBE7E',
    successSurface: '#122A1C',
    warning: '#E0B23D',
    warningSurface: '#332A11',
    destructive: '#E85D58',
    onDestructive: '#FFFFFF',
    tint: '#8FAAFF',
    onTint: '#071D43',
    icon: '#A7B0C0',
    tabIconDefault: '#A7B0C0',
    tabIconSelected: '#8FAAFF',
  },
};

/** Compact sizing shared by navigation, forms, and list screens. */
export const Design = {
  screenPadding: 20,
  sectionGap: 20,
  controlRadius: 14,
  cardRadius: 20,
  sheetRadius: 24,
  pillRadius: 999,
  touchTarget: 44,
  colors: {
    navy: '#071D43',
    blue: '#6488E8',
    lavender: '#817BFA',
    orange: '#FF934F',
    blueTint: '#F0F3FC',
    line: '#E5E9F2',
    surface: '#F7F8FC',
  },
  type: {
    body: { fontSize: 15, lineHeight: 22 },
    title: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
    subtitle: { fontSize: 17, lineHeight: 23, fontWeight: '600' as const },
  },
};
