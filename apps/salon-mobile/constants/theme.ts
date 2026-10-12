/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Light mode stays on Gleami navy. Dark mode follows Fresha: pure black surfaces and a purple accent.
const textLight = '#071D43';

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
    text: '#FFFFFF',
    background: '#000000',
    surface: '#1C1C1E',
    border: '#2C2C2E',
    muted: '#8E8E93',
    blueTint: '#2A2152',
    brandBlue: '#A78BFA',
    error: '#FF453A',
    errorSurface: '#3A1214',
    success: '#30D158',
    successSurface: '#0C2818',
    warning: '#FFD60A',
    warningSurface: '#2C2608',
    destructive: '#FF453A',
    onDestructive: '#FFFFFF',
    tint: '#6E56F5',
    onTint: '#FFFFFF',
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#6E56F5',
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
