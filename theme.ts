import { useColorScheme } from 'react-native';
export { money } from './money';

export const palettes = {
  light: {
    bg: '#f7fafc',
    bg2: '#e0e7ff',
    card: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    primary: '#312e81',
    tagBg: '#e0e7ff',
    tagText: '#3730a3',
    priceBg: '#fef9c3',
    priceText: '#d97706',
  },
  dark: {
    bg: '#0b1220',
    bg2: '#0b1220',
    card: '#0f172a',
    text: '#e5e7eb',
    textMuted: '#94a3b8',
    primary: '#a5b4fc',
    tagBg: '#1e293b',
    tagText: '#a5b4fc',
    priceBg: '#1f2937',
    priceText: '#fbbf24',
  },
};

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  const c = palettes[scheme];
  return { scheme, colors: c };
}
