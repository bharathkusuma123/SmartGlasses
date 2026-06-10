// src/native/HeyCyanTypes.ts
export interface HeyCyanDevice {
  id: string;
  name: string;
  macAddress?: string;
  rssi: number;
  scanRecordHex?: string;
}

export interface BatteryStatus {
  level: number;      // 0-100
  isCharging: boolean;
}

export interface MediaCounts {
  photos: number;
  videos: number;
  audios: number;
}

export interface PhotoCaptureResult {
  success: boolean;
  beforeCount: number;
  afterCount: number;
  message: string;
}

export interface DeviceVersion {
  hardware: string;
  firmware: string;
  wifiHardware: string;
  wifiFirmware: string;
}

export interface SdkState {
  initialized: boolean;
  connected: boolean;
  ready: boolean;
  serviceDiscovered?: boolean;
  characteristicsDiscovered?: boolean;
  notificationsEnabled?: boolean;
  largeDataNotificationsEnabled?: boolean;
  timeSynced?: boolean;
  deviceAddress: string;
  waitingForPhotoTransfer?: boolean;
  photoDelivered?: boolean;
  respMapKeys: string;
  noClearMapKeys: string;
}

export interface SdkLogEvent {
  level: string;
  message: string;
  timestamp: number;
}

export interface BleNotificationEvent {
  uuid: string;
  hex: string;
  source: string;
  timestamp: number;
}

export interface CapturedPhoto {
  id: string;
  uri: string;
  base64?: string;
  timestamp: number;
  synced: boolean;
}

export type RecordingType = 'photo' | 'video' | 'audio' | 'ai_photo';

export interface HeyCyanEvents {
  onDeviceDiscovered: (device: HeyCyanDevice) => void;
  onDeviceConnected: (device: HeyCyanDevice) => void;
  onDeviceDisconnected: (deviceId: string) => void;
  onBluetoothStateChanged: (status: Record<string, unknown>) => void;
  onScanResult: (device: HeyCyanDevice) => void;
  onConnecting: (device: Partial<HeyCyanDevice>) => void;
  onConnected: (device: HeyCyanDevice) => void;
  onDisconnected: (event: Record<string, unknown>) => void;
  onBatteryUpdate: (status: BatteryStatus) => void;
  onMediaCountsUpdate: (counts: MediaCounts) => void;
  onMediaUpdate: (counts: MediaCounts) => void;
  onPhotoReceived: (photoBase64: string, photoId: string, photoUri?: string) => void;
  onPhotoStarted: (event: Record<string, unknown>) => void;
  onPhotoCompleted: (event: Record<string, unknown>) => void;
  onPhotoFailed: (event: Record<string, unknown>) => void;
  onBleNotification: (event: BleNotificationEvent) => void;
  onAIImageReceived: (imageBase64: string) => void;
  onSdkLog: (event: SdkLogEvent) => void;
  onSdkError: (event: Record<string, unknown>) => void;
  onError: (error: string) => void;
}
