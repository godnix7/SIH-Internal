import { Platform } from 'react-native';

export const light = {
  primary: '#1A73E8',
  primaryContainer: '#D3E3FD',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  onSurface: '#1C1B1F',
  onSurfaceVariant: '#49454F',
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  success: '#1B873B',
  warning: '#E37400',
  critical: '#DC2626',
  monitoringActive: '#1A73E8',
  monitoringEmergency: '#DC2626',
};

export const dark: typeof light = {
  ...light,
  primary: '#8AB4F8',
  primaryContainer: '#004A77',
  surface: '#1C1B1F',
  surfaceVariant: '#2C2C2E',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  error: '#F2B8B5',
  errorContainer: '#8C1D18',
  success: '#6DD58C',
  warning: '#FFB74D',
  critical: '#FF6B6B',
  monitoringActive: '#8AB4F8',
  monitoringEmergency: '#FF6B6B',
};

export type Colors = typeof light;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { small: 8, medium: 12, large: 16, full: 9999 } as const;

export const type = {
  display: { fontFamily: 'Inter_600SemiBold', fontSize: 32, lineHeight: 40 },
  headline: { fontFamily: 'Inter_600SemiBold', fontSize: 24, lineHeight: 32 },
  title: { fontFamily: 'Inter_500Medium', fontSize: 20, lineHeight: 28 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 16,
  },
} as const;

export const elevation = Platform.select({
  android: { elevation: 2 },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
