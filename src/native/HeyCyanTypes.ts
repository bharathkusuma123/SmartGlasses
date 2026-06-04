// src/native/HeyCyanTypes.ts
export interface HeyCyanDevice {
  id: string;
  name: string;
  macAddress: string;
  rssi: number;
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

export interface DeviceVersion {
  hardware: string;
  firmware: string;
  wifiHardware: string;
  wifiFirmware: string;
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
  onBatteryUpdate: (status: BatteryStatus) => void;
  onMediaCountsUpdate: (counts: MediaCounts) => void;
  onPhotoReceived: (photoBase64: string, photoId: string) => void;  // New: when glasses take photo
  onAIImageReceived: (imageBase64: string) => void;
  onError: (error: string) => void;
}