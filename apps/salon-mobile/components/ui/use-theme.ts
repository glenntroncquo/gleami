import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Theme = typeof Colors.light;

export function useTheme(): Theme {
  return Colors[useColorScheme() ?? 'light'];
}
