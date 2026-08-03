import { BleManager, Device } from 'react-native-ble-plx';
import * as Crypto from 'expo-crypto';

// Shared UUID for Yatri Shield Mesh Network
export const MESH_SERVICE_UUID = 'A1B2C3D4-E5F6-7890-1234-56789ABCDEF0';

class MeshService {
  private manager: BleManager;
  private isScanning = false;
  private isBroadcasting = false;

  constructor() {
    try {
      this.manager = new BleManager();
    } catch (e) {
      console.warn(
        'BleManager could not be initialized (likely running in Expo Go). BLE features will be disabled.',
      );
      this.manager = null as any;
    }
  }

  /**
   * Generates a tiny payload to fit within BLE advertisement limits (~31 bytes).
   * For the MVP, we assume the data is base64 encoded.
   */
  private async compressSOSPayload(sosId: string, lat: number, lon: number): Promise<string> {
    const payload = `${sosId}|${lat.toFixed(4)}|${lon.toFixed(4)}`;
    // Sign payload
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payload + 'secret_device_key', // In prod, use actual private key
    );
    // Base64 encode for BLE
    return btoa(`${payload}|${hash.substring(0, 8)}`);
  }

  /**
   * Activates BLE Peripheral mode to scream the SOS beacon.
   * Note: react-native-ble-plx is primarily for Central (scanning).
   * A full production app would use react-native-ble-peripheral for advertising.
   */
  public async startBroadcastingSOS(sosId: string, lat: number, lon: number) {
    if (this.isBroadcasting) return;

    console.log('[MESH] Generating offline SOS beacon...');
    const encodedPayload = await this.compressSOSPayload(sosId, lat, lon);
    console.log(`[MESH] Beacon payload ready: ${encodedPayload}`);

    // MOCK BROADCAST: Expo doesn't support BLE Peripheral natively without custom plugins.
    // In a custom dev client, this would start the GAP Advertising.
    this.isBroadcasting = true;
    console.log('[MESH] Now screaming BLE beacon to nearby devices...');

    // Simulate broadcasting loop
    setInterval(() => {
      if (this.isBroadcasting) {
        console.log(`[MESH BROADCASTING] SOS Beacon Active...`);
      }
    }, 5000);
  }

  public stopBroadcasting() {
    this.isBroadcasting = false;
    console.log('[MESH] Stopped broadcasting SOS beacon.');
  }

  /**
   * Activates BLE Central mode to scan for nearby tourists screaming SOS.
   */
  public startScanningForRelays() {
    if (this.isScanning) return;
    if (!this.manager) {
      console.warn('[MESH] BLE Manager is not available. Skipping scan.');
      return;
    }

    this.isScanning = true;
    console.log('[MESH] Started background scanning for nearby SOS beacons...');

    this.manager.startDeviceScan(
      [MESH_SERVICE_UUID],
      { allowDuplicates: false },
      async (error, device) => {
        if (error) {
          console.warn('[MESH] Scan error:', error.message);
          return;
        }

        if (device && device.name === 'YATRI_SOS') {
          console.log('[MESH] Found a tourist in distress! Device:', device.id);
          // Assuming the payload is hidden in ManufacturerData or LocalName
          const payload = device.manufacturerData;
          if (payload) {
            await this.relaySOS(payload);
          }
        }
      },
    );
  }

  public stopScanning() {
    this.isScanning = false;
    if (this.manager) {
      this.manager.stopDeviceScan();
    }
    console.log('[MESH] Stopped scanning.');
  }

  /**
   * If we receive a beacon and we have internet, push it to the backend.
   */
  private async relaySOS(base64Payload: string) {
    try {
      console.log(`[MESH] Relaying SOS payload to backend: ${base64Payload}`);
      // Send to the backend ingest route
      const { api } = require('./api');
      await api.post('/sos/mesh-ingest', {
        payload: base64Payload,
        relayedAt: new Date().toISOString(),
      });
      console.log('[MESH] Successfully relayed SOS for another tourist.');
    } catch (e) {
      console.error('[MESH] Failed to relay SOS. Will try again later.', e);
      // If we also don't have internet, we should theoretically re-broadcast it!
    }
  }
}

export const meshService = new MeshService();
