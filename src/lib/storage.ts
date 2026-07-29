import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'yatrishield_access_token';
const REFRESH_TOKEN_KEY = 'yatrishield_refresh_token';
const SOS_TOKEN_KEY = 'yatrishield_sos_token';
const DEVICE_PIN_KEY = 'yatrishield_device_pin';

export const storage = {
  async setDevicePin(pin: string) {
    try {
      await SecureStore.setItemAsync(DEVICE_PIN_KEY, pin);
    } catch (e) {
      console.error('Failed to save device pin', e);
    }
  },

  async getDevicePin() {
    try {
      return await SecureStore.getItemAsync(DEVICE_PIN_KEY);
    } catch {
      return null;
    }
  },

  async setTokens(access: string, refresh: string, sos: string) {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
      await SecureStore.setItemAsync(SOS_TOKEN_KEY, sos);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save tokens', e);
    }
  },

  async getAccessToken() {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken() {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getSosToken() {
    try {
      return await SecureStore.getItemAsync(SOS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async clearTokens() {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(SOS_TOKEN_KEY);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear tokens', e);
    }
  },
};
