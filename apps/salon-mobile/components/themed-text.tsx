import { StyleSheet, Text, type TextProps } from 'react-native';

import { Design } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...Design.type.body,
  },
  defaultSemiBold: {
    ...Design.type.body,
    fontWeight: '600',
  },
  title: {
    ...Design.type.title,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...Design.type.subtitle,
    letterSpacing: -0.2,
  },
  link: {
    ...Design.type.body,
    textDecorationLine: 'underline',
  },
});
