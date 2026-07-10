import { createMMKV } from 'react-native-mmkv';

export const preferences = createMMKV({ id: 'yatri-shield.preferences' });

export function getBooleanPreference(key: string, fallback = false): boolean {
  return preferences.getBoolean(key) ?? fallback;
}
