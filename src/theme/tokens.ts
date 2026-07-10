import { Platform } from 'react-native';

export const light = {
  ink: '#16202B',
  paper: '#FAF7F2',
  card: '#FFFFFF',
  slate: '#5B6B7B',
  hairline: '#E6E1D8',
  trail: '#1F6F54',
  trailDeep: '#14503C',
  amber: '#B7791F',
  signal: '#C2402A',
  signalDeep: '#9A3120',
  sky: '#2C5F8A',
};

export const dark: typeof light = {
  ...light,
  ink: '#F2EEE7',
  paper: '#0E1620',
  card: '#16202B',
  slate: '#B9C1C9',
  hairline: '#2A3744',
};

export type Colors = typeof light;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { card: 12, button: 10, sheet: 20, pill: 999 } as const;

export const type = {
  display: { fontFamily: 'Fraunces_600SemiBold', fontSize: 32, lineHeight: 38 },
  title: { fontFamily: 'Fraunces_500Medium', fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 24 },
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
