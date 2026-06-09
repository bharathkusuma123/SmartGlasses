import { BleManager, Characteristic, Device, Service } from 'react-native-ble-plx';
import type { BleError, Subscription } from 'react-native-ble-plx';
import { sdkLogger } from './SDKLogger';

export interface MonitoredCharacteristic {
  serviceUUID: string;
  characteristicUUID: string;
  isReadable: boolean;
  isNotifiable: boolean;
  isIndicatable: boolean;
  isWritableWithResponse: boolean;
  isWritableWithoutResponse: boolean;
}

const UUID_ALIASES: Record<string, string[]> = {
  FEE3: ['fee3'],
  AE01: ['ae01'],
  AE03: ['ae03'],
  '4A02': ['4a02'],
};

const bytesToHex = (bytes: number[]) => bytes.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const base64ToBytes = (value: string): number[] => {
  const clean = value.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const index = base64Alphabet.indexOf(char);
    if (index < 0) {
      continue;
    }

    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xFF);
    }
  }

  return bytes;
};

const bytesToBase64 = (bytes: number[]) => {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const triple = (first << 16) | (second << 8) | third;

    output += base64Alphabet[(triple >> 18) & 0x3F];
    output += base64Alphabet[(triple >> 12) & 0x3F];
    output += index + 1 < bytes.length ? base64Alphabet[(triple >> 6) & 0x3F] : '=';
    output += index + 2 < bytes.length ? base64Alphabet[triple & 0x3F] : '=';
  }

  return output;
};

const hexToBytes = (hex: string) => {
  const normalized = hex.replace(/0x/gi, '').replace(/[^a-fA-F0-9]/g, '');
  const bytes: number[] = [];
  for (let index = 0; index < normalized.length; index += 2) {
    const chunk = normalized.slice(index, index + 2);
    if (chunk.length === 2) {
      bytes.push(parseInt(chunk, 16));
    }
  }
  return bytes;
};

const describeError = (error: BleError | Error | null | undefined) => {
  if (!error) {
    return undefined;
  }
  return {
    message: error.message,
    reason: 'reason' in error ? error.reason : undefined,
    errorCode: 'errorCode' in error ? error.errorCode : undefined,
  };
};

export class BleMonitor {
  private manager = new BleManager();
  private connectedDevice: Device | null = null;
  private characteristics: MonitoredCharacteristic[] = [];
  private subscriptions: Subscription[] = [];

  getDevice() {
    return this.connectedDevice;
  }

  getCharacteristics() {
    return this.characteristics;
  }

  async scanForDevice(nameHint = 'V03_982A', timeoutMs = 12000): Promise<Device> {
    sdkLogger.info('BLE', 'Starting BLE discovery scan', { nameHint, timeoutMs });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        sdkLogger.error('BLE', 'Discovery scan timeout', { nameHint });
        reject(new Error(`No matching glasses found for ${nameHint}`));
      }, timeoutMs);

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timer);
          this.manager.stopDeviceScan();
          sdkLogger.error('BLE', 'Discovery scan error', describeError(error));
          reject(error);
          return;
        }

        if (!device) {
          return;
        }

        sdkLogger.debug('BLE', 'Device discovered', {
          id: device.id,
          name: device.name,
          localName: device.localName,
          rssi: device.rssi,
          serviceUUIDs: device.serviceUUIDs,
        });

        const deviceName = device.name ?? device.localName ?? '';
        if (deviceName.toLowerCase().includes(nameHint.toLowerCase())) {
          clearTimeout(timer);
          this.manager.stopDeviceScan();
          sdkLogger.info('BLE', 'Matching glasses discovered', {
            id: device.id,
            name: device.name,
            localName: device.localName,
            rssi: device.rssi,
          });
          resolve(device);
        }
      });
    });
  }

  async scanAndConnect(nameHint = 'V03_982A', timeoutMs = 12000): Promise<Device> {
    sdkLogger.info('BLE', 'Starting BLE scan', { nameHint, timeoutMs });
    await this.disconnect();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.manager.stopDeviceScan();
        sdkLogger.error('BLE', 'Scan timeout', { nameHint });
        reject(new Error(`No matching glasses found for ${nameHint}`));
      }, timeoutMs);

      this.manager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          clearTimeout(timer);
          this.manager.stopDeviceScan();
          sdkLogger.error('BLE', 'Scan error', describeError(error));
          reject(error);
          return;
        }

        if (!device) {
          return;
        }

        sdkLogger.debug('BLE', 'Device discovered', {
          id: device.id,
          name: device.name,
          localName: device.localName,
          rssi: device.rssi,
          serviceUUIDs: device.serviceUUIDs,
        });

        const deviceName = device.name ?? device.localName ?? '';
        if (!deviceName.toLowerCase().includes(nameHint.toLowerCase())) {
          return;
        }

        clearTimeout(timer);
        this.manager.stopDeviceScan();

        try {
          const connected = await this.connect(device);
          resolve(connected);
        } catch (connectError) {
          reject(connectError);
        }
      });
    });
  }

  async connect(device: Device): Promise<Device> {
    sdkLogger.info('BLE', 'Connecting BLE monitor', { id: device.id, name: device.name });
    const connected = await device.connect({ autoConnect: false });
    this.connectedDevice = connected;
    sdkLogger.info('BLE', 'BLE monitor connected', { id: connected.id, name: connected.name });
    await connected.discoverAllServicesAndCharacteristics();
    sdkLogger.info('BLE', 'Services and characteristics discovered');
    await this.inspectGatt();
    return connected;
  }

  async inspectGatt() {
    if (!this.connectedDevice) {
      throw new Error('BLE monitor has no connected device');
    }

    const services = await this.connectedDevice.services();
    this.characteristics = [];
    sdkLogger.info('BLE', 'Service count', { count: services.length });

    for (const service of services) {
      await this.inspectService(service);
    }
  }

  async enableNotifications() {
    if (!this.connectedDevice) {
      throw new Error('BLE monitor has no connected device');
    }

    this.clearSubscriptions();
    for (const characteristic of this.characteristics) {
      if (!characteristic.isNotifiable && !characteristic.isIndicatable) {
        continue;
      }

      sdkLogger.info('BLE', 'Subscribing characteristic notifications', characteristic);
      const subscription = this.manager.monitorCharacteristicForDevice(
        this.connectedDevice.id,
        characteristic.serviceUUID,
        characteristic.characteristicUUID,
        (error, update) => {
          if (error) {
            sdkLogger.error('BLE', 'Notify error', { characteristic, error: describeError(error) });
            return;
          }
          this.logCharacteristicValue('NOTIFY', update);
        }
      );
      this.subscriptions.push(subscription);
    }

    sdkLogger.info('BLE', 'Notification subscription pass complete', { count: this.subscriptions.length });
  }

  async sendHexToAlias(alias: string, hex: string) {
    const characteristic = this.findCharacteristic(alias);
    if (!characteristic || !this.connectedDevice) {
      throw new Error(`No connected characteristic found for ${alias}`);
    }

    const bytes = hexToBytes(hex);
    const base64 = bytesToBase64(bytes);
    sdkLogger.info('BLE', 'WRITE operation', {
      alias,
      hex: bytesToHex(bytes),
      base64,
      characteristic,
    });

    const write = characteristic.isWritableWithResponse
      ? this.manager.writeCharacteristicWithResponseForDevice(
        this.connectedDevice.id,
        characteristic.serviceUUID,
        characteristic.characteristicUUID,
        base64
      )
      : this.manager.writeCharacteristicWithoutResponseForDevice(
        this.connectedDevice.id,
        characteristic.serviceUUID,
        characteristic.characteristicUUID,
        base64
      );

    const result = await write;
    this.logCharacteristicValue('WRITE_RESULT', result);
  }

  async disconnect() {
    this.clearSubscriptions();
    const device = this.connectedDevice;
    this.connectedDevice = null;
    this.characteristics = [];

    if (device) {
      const connected = await device.isConnected().catch(() => false);
      if (connected) {
        sdkLogger.info('BLE', 'Disconnecting BLE monitor', { id: device.id });
        await device.cancelConnection();
      }
    }
  }

  destroy() {
    this.clearSubscriptions();
    this.manager.destroy();
  }

  private async inspectService(service: Service) {
    sdkLogger.info('BLE', 'Service discovered', {
      serviceUUID: service.uuid,
      isPrimary: service.isPrimary,
    });

    const characteristics = await service.characteristics();
    for (const characteristic of characteristics) {
      const monitored: MonitoredCharacteristic = {
        serviceUUID: characteristic.serviceUUID,
        characteristicUUID: characteristic.uuid,
        isReadable: characteristic.isReadable,
        isNotifiable: characteristic.isNotifiable,
        isIndicatable: characteristic.isIndicatable,
        isWritableWithResponse: characteristic.isWritableWithResponse,
        isWritableWithoutResponse: characteristic.isWritableWithoutResponse,
      };

      this.characteristics.push(monitored);
      sdkLogger.info('BLE', 'Characteristic discovered', monitored);

      if (characteristic.isReadable) {
        try {
          const read = await characteristic.read();
          this.logCharacteristicValue('READ', read);
        } catch (error) {
          sdkLogger.warn('BLE', 'READ failed', { monitored, error: describeError(error as BleError) });
        }
      }
    }
  }

  private findCharacteristic(alias: string) {
    const needles = UUID_ALIASES[alias] ?? [alias.toLowerCase()];
    return this.characteristics.find(characteristic => {
      const uuid = characteristic.characteristicUUID.toLowerCase();
      return needles.some(needle => uuid.includes(needle.toLowerCase()));
    });
  }

  private logCharacteristicValue(kind: 'READ' | 'NOTIFY' | 'WRITE_RESULT', characteristic: Characteristic | null) {
    if (!characteristic) {
      return;
    }

    const value = characteristic.value ?? '';
    const bytes = value ? base64ToBytes(value) : [];
    sdkLogger.info('BLE', `${kind} value`, {
      serviceUUID: characteristic.serviceUUID,
      characteristicUUID: characteristic.uuid,
      base64: value,
      hex: bytesToHex(bytes),
      byteLength: bytes.length,
    });
  }

  private clearSubscriptions() {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }
}

export const RAW_COMMANDS = [
  { label: 'Test Command 1', hex: '01' },
  { label: 'Test Command 2', hex: 'A5 01' },
  { label: 'Test Command 3', hex: '02' },
  { label: 'Test Command 4', hex: 'A5 02' },
];

export const RAW_CHARACTERISTICS = ['FEE3', 'AE01', 'AE03', '4A02'];
