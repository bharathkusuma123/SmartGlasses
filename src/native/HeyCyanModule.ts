import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { HeyCyanDevice, BatteryStatus, MediaCounts, DeviceVersion } from './HeyCyanTypes';

const { HeyCyanGlasses } = NativeModules;
const eventEmitter = new NativeEventEmitter(HeyCyanGlasses);

class HeyCyanManager {
  private listeners: Map<string, () => void> = new Map();

  // Initialize SDK
  initialize(): Promise<boolean> {
    return HeyCyanGlasses.initialize();
  }

  // Scan for devices
  startScan(): void {
    HeyCyanGlasses.startScan();
  }

  stopScan(): void {
    HeyCyanGlasses.stopScan();
  }

  // Connect/Disconnect
  connect(deviceId: string): Promise<boolean> {
    return HeyCyanGlasses.connect(deviceId);
  }

  disconnect(): Promise<boolean> {
    return HeyCyanGlasses.disconnect();
  }

  // Device Controls
  takePhoto(): Promise<boolean> {
    return HeyCyanGlasses.takePhoto();
  }

  startVideo(): Promise<boolean> {
    return HeyCyanGlasses.startVideo();
  }

  stopVideo(): Promise<boolean> {
    return HeyCyanGlasses.stopVideo();
  }

  startAudio(): Promise<boolean> {
    return HeyCyanGlasses.startAudio();
  }

  stopAudio(): Promise<boolean> {
    return HeyCyanGlasses.stopAudio();
  }

  generateAIPhoto(): Promise<boolean> {
    return HeyCyanGlasses.generateAIPhoto();
  }

  // Get Device Info
  getBattery(): Promise<BatteryStatus> {
    return HeyCyanGlasses.getBattery();
  }

  getMediaCounts(): Promise<MediaCounts> {
    return HeyCyanGlasses.getMediaCounts();
  }

  getVersionInfo(): Promise<DeviceVersion> {
    return HeyCyanGlasses.getVersionInfo();
  }

  syncTime(): Promise<boolean> {
    return HeyCyanGlasses.syncTime();
  }

  // Event Listeners
  onDeviceDiscovered(callback: (device: HeyCyanDevice) => void): () => void {
    const subscription = eventEmitter.addListener('onDeviceDiscovered', callback);
    return () => subscription.remove();
  }

  onDeviceConnected(callback: (device: HeyCyanDevice) => void): () => void {
    const subscription = eventEmitter.addListener('onDeviceConnected', callback);
    return () => subscription.remove();
  }

  onDeviceDisconnected(callback: (deviceId: string) => void): () => void {
    const subscription = eventEmitter.addListener('onDeviceDisconnected', callback);
    return () => subscription.remove();
  }

  onBatteryUpdate(callback: (status: BatteryStatus) => void): () => void {
    const subscription = eventEmitter.addListener('onBatteryUpdate', callback);
    return () => subscription.remove();
  }

  onMediaCountsUpdate(callback: (counts: MediaCounts) => void): () => void {
    const subscription = eventEmitter.addListener('onMediaCountsUpdate', callback);
    return () => subscription.remove();
  }

  onAIImageReceived(callback: (imageBase64: string) => void): () => void {
    const subscription = eventEmitter.addListener('onAIImageReceived', callback);
    return () => subscription.remove();
  }

  onError(callback: (error: string) => void): () => void {
    const subscription = eventEmitter.addListener('onError', callback);
    return () => subscription.remove();
  }
}

export default new HeyCyanManager();