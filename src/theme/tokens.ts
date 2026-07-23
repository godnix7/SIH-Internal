import { Platform } from 'react-native';

export const light = {
  primary: '#1F6F54', // old trail
  primaryContainer: '#14503C', // old trailDeep
  surface: '#FAF7F2', // old paper
  surfaceVariant: '#FFFFFF', // old card
  onSurface: '#16202B', // old ink
  onSurfaceVariant: '#5B6B7B', // old slate
  error: '#C2402A', // old signal
  errorContainer: '#9A3120', // old signalDeep
  success: '#1F6F54',
  warning: '#B7791F', // old amber
  critical: '#C2402A',
  monitoringActive: '#2C5F8A', // old sky
  monitoringEmergency: '#C2402A',
};

export const dark: typeof light = {
  ...light,
  primary: '#1F6F54',
  primaryContainer: '#14503C',
  surface: '#0E1620', // dark paper
  surfaceVariant: '#16202B', // dark card
  onSurface: '#F2EEE7', // dark ink
  onSurfaceVariant: '#B9C1C9', // dark slate
  error: '#C2402A',
  errorContainer: '#9A3120',
  success: '#1F6F54',
  warning: '#B7791F',
  critical: '#C2402A',
  monitoringActive: '#2C5F8A',
  monitoringEmergency: '#C2402A',
};

export type Colors = typeof light;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { small: 8, medium: 12, large: 16, full: 9999 } as const;

export const type = {
  display: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, lineHeight: 38 },
  headline: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, lineHeight: 32 },
  title: { fontFamily: 'Fraunces_500Medium', fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: 'Inter_500Medium', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 18,
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
