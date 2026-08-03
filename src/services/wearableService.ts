import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { useAppStore } from '../stores/useAppStore';

// Bluetooth SIG Standard UUIDs for Heart Rate
const HR_SERVICE_UUID = '180d'; // technically 0000180d-0000-1000-8000-00805f9b34fb
const HR_MEASUREMENT_CHARACTERISTIC_UUID = '2a37'; // 00002a37-0000-1000-8000-00805f9b34fb

interface BPMRecord {
  bpm: number;
  timestamp: number;
}

class WearableService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private bpmHistory: BPMRecord[] = [];

  // Rolling window of 30 seconds
  private readonly WINDOW_MS = 30000;

  constructor() {
    try {
      this.manager = new BleManager();
    } catch (e) {
      console.warn(
        'BleManager could not be initialized in WearableService (likely running in Expo Go). BLE features will be disabled.',
      );
      this.manager = null as any;
    }
  }

  public async scanAndConnect() {
    if (!this.manager) {
      console.warn('[WEARABLE] BLE Manager is not available. Skipping scan.');
      return;
    }
    console.log('[WEARABLE] Scanning for Heart Rate Monitors...');

    // We only scan for devices that advertise the standard Heart Rate Service
    this.manager.startDeviceScan([HR_SERVICE_UUID], null, async (error, device) => {
      if (error) {
        console.error('[WEARABLE] BLE Scan Error:', error);
        return;
      }

      if (device) {
        console.log(`[WEARABLE] Found HRM Device: ${device.name || device.id}`);
        this.manager.stopDeviceScan();
        await this.connectToDevice(device);
      }
    });
  }

  private async connectToDevice(device: Device) {
    try {
      const connectedDevice = await device.connect();
      this.connectedDevice = connectedDevice;
      console.log(`[WEARABLE] Connected to ${connectedDevice.name || connectedDevice.id}`);

      // Update Global State
      useAppStore.getState().setWearableConnected(true);

      const deviceWithServices = await connectedDevice.discoverAllServicesAndCharacteristics();

      // Subscribe to the Heart Rate Measurement Characteristic
      deviceWithServices.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_MEASUREMENT_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('[WEARABLE] Subscription Error:', error);
            this.handleDisconnect();
            return;
          }
          if (characteristic?.value) {
            this.parseHeartRate(characteristic.value);
          }
        },
      );
    } catch (e) {
      console.error('[WEARABLE] Connection failed:', e);
      this.handleDisconnect();
    }
  }

  private parseHeartRate(base64Value: string) {
    // React Native environment might lack native Buffer, so we use atob to decode base64
    // to a binary string, then read the byte values.
    try {
      const binaryString = atob(base64Value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // BLE Heart Rate Profile standard parsing:
      // First byte is flags.
      // Bit 0 determines if the BPM format is UINT8 (0) or UINT16 (1).
      const flags = bytes[0];
      const is16Bit = (flags & 0x01) !== 0;

      let bpm = 0;
      if (is16Bit && bytes.length >= 3) {
        bpm = bytes[1] | (bytes[2] << 8);
      } else if (!is16Bit && bytes.length >= 2) {
        bpm = bytes[1];
      }

      if (bpm > 0) {
        this.logBpm(bpm);
      }
    } catch (e) {
      console.error('[WEARABLE] Parsing error:', e);
    }
  }

  private logBpm(bpm: number) {
    const now = Date.now();
    this.bpmHistory.push({ bpm, timestamp: now });

    // Prune history older than 30 seconds
    const cutoff = now - this.WINDOW_MS;
    this.bpmHistory = this.bpmHistory.filter((record) => record.timestamp >= cutoff);
  }

  /**
   * Called by aiEngine.ts during a physical impact to check if the user is in distress.
   * Returns current BPM and a boolean indicating if there's an anomalous spike.
   */
  public getVitalContext(): { isSpiking: boolean; currentBpm: number | null } {
    if (this.bpmHistory.length === 0) {
      return { isSpiking: false, currentBpm: null };
    }

    const currentBpm = this.bpmHistory[this.bpmHistory.length - 1].bpm;

    // Simple spike detection:
    // If current BPM is > 120 and the delta from the lowest in the window is high
    let lowest = currentBpm;
    for (const record of this.bpmHistory) {
      if (record.bpm < lowest) {
        lowest = record.bpm;
      }
    }

    // A sudden increase of 30+ BPM or absolute BPM > 120 during an impact is suspicious.
    const isSpiking = currentBpm > 120 || currentBpm - lowest > 30;

    return {
      isSpiking,
      currentBpm,
    };
  }

  private handleDisconnect() {
    this.connectedDevice = null;
    useAppStore.getState().setWearableConnected(false);
  }

  public disconnect() {
    if (this.connectedDevice && this.manager) {
      this.manager.cancelDeviceConnection(this.connectedDevice.id);
      this.handleDisconnect();
    }
  }
}

export const wearableService = new WearableService();
