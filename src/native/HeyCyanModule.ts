import { EventSubscription } from 'expo-modules-core';
import { requireNativeModule } from 'expo';
import { HeyCyanDevice, BatteryStatus, MediaCounts, DeviceVersion, SdkLogEvent, SdkState, BleNotificationEvent } from './HeyCyanTypes';

const HeyCyanGlasses = requireNativeModule('HeyCyanGlasses');

const log = (message: string, data?: unknown) => {
  if (data === undefined) {
    console.log(`[HeyCyan JS] ${message}`);
    return;
  }
  console.log(`[HeyCyan JS] ${message}`, data);
};

const ensureNativeModule = () => {
  if (!HeyCyanGlasses) {
    throw new Error('HeyCyanGlasses native module is not linked. Rebuild the Android dev client after adding the local Expo module.');
  }
};

class HeyCyanManager {
  private listeners: Map<string, () => void> = new Map();

  // Initialize SDK
  initialize(): Promise<boolean> {
    ensureNativeModule();
    log('initialize()');
    return HeyCyanGlasses.initialize();
  }

  // Scan for devices
  startScan(): Promise<boolean> {
    ensureNativeModule();
    log('startScan()');
    return HeyCyanGlasses.startScan();
  }

  stopScan(): Promise<boolean> {
    ensureNativeModule();
    log('stopScan()');
    return HeyCyanGlasses.stopScan();
  }

  // Connect/Disconnect
  connect(deviceId: string): Promise<boolean> {
    ensureNativeModule();
    log('connect()', { deviceId });
    return HeyCyanGlasses.connect(deviceId);
  }

  disconnect(): Promise<boolean> {
    ensureNativeModule();
    log('disconnect()');
    return HeyCyanGlasses.disconnect();
  }

  isConnected(): Promise<boolean> {
    ensureNativeModule();
    log('isConnected()');
    return HeyCyanGlasses.isConnected();
  }

  isReady(): Promise<boolean> {
    ensureNativeModule();
    log('isReady()');
    return HeyCyanGlasses.isReady();
  }

  // Device Controls
  takePhoto(): Promise<boolean> {
    ensureNativeModule();
    log('takePhoto()');
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
    ensureNativeModule();
    log('getBattery()');
    return HeyCyanGlasses.getBattery();
  }

  getMediaCounts(): Promise<MediaCounts> {
    ensureNativeModule();
    log('getMediaCounts()');
    return HeyCyanGlasses.getMediaCounts();
  }

  getVersionInfo(): Promise<DeviceVersion> {
    ensureNativeModule();
    log('getVersionInfo()');
    return HeyCyanGlasses.getVersionInfo();
  }

  getVersion(): Promise<DeviceVersion> {
    return this.getVersionInfo();
  }

  getMediaCount(): Promise<MediaCounts> {
    return this.getMediaCounts();
  }

  syncTime(): Promise<boolean> {
    ensureNativeModule();
    log('syncTime()');
    return HeyCyanGlasses.syncTime();
  }

  enableNotifications(): Promise<SdkState> {
    ensureNativeModule();
    log('enableNotifications()');
    return HeyCyanGlasses.enableNotifications();
  }

  dumpSdkState(): Promise<SdkState> {
    ensureNativeModule();
    log('dumpSdkState()');
    return HeyCyanGlasses.dumpSdkState();
  }

  private addListener<T>(eventName: string, callback: (payload: T) => void): () => void {
    ensureNativeModule();
    const subscription: EventSubscription = HeyCyanGlasses.addListener(eventName, callback);
    return () => subscription.remove();
  }

  // Event Listeners
  onDeviceDiscovered(callback: (device: HeyCyanDevice) => void): () => void {
    return this.addListener('onDeviceDiscovered', callback);
  }

  onBluetoothStateChanged(callback: (status: Record<string, unknown>) => void): () => void {
    return this.addListener('onBluetoothStateChanged', callback);
  }

  onScanResult(callback: (device: HeyCyanDevice) => void): () => void {
    return this.addListener('onScanResult', callback);
  }

  onConnecting(callback: (device: Partial<HeyCyanDevice>) => void): () => void {
    return this.addListener('onConnecting', callback);
  }

  onConnected(callback: (device: HeyCyanDevice) => void): () => void {
    return this.addListener('onConnected', callback);
  }

  onDisconnected(callback: (event: Record<string, unknown>) => void): () => void {
    return this.addListener('onDisconnected', callback);
  }

  onDeviceConnected(callback: (device: HeyCyanDevice) => void): () => void {
    return this.addListener('onDeviceConnected', callback);
  }

  onDeviceDisconnected(callback: (deviceId: string) => void): () => void {
    return this.addListener<{ deviceId?: string } | string>('onDeviceDisconnected', (event) => {
      callback(typeof event === 'string' ? event : event.deviceId ?? '');
    });
  }

  onBatteryUpdate(callback: (status: BatteryStatus) => void): () => void {
    return this.addListener('onBatteryUpdate', callback);
  }

  onMediaCountsUpdate(callback: (counts: MediaCounts) => void): () => void {
    return this.addListener('onMediaCountsUpdate', callback);
  }

  onMediaUpdate(callback: (counts: MediaCounts) => void): () => void {
    return this.addListener('onMediaUpdate', callback);
  }

  onPhotoReceived(callback: (photoBase64: string, photoId: string) => void): () => void {
    return this.addListener<{ photoBase64: string; photoId: string }>('onPhotoReceived', (event) => {
      callback(event.photoBase64, event.photoId);
    });
  }

  onCaptureStatus(callback: (status: Record<string, unknown>) => void): () => void {
    return this.addListener('onCaptureStatus', callback);
  }

  onAIImageReceived(callback: (imageBase64: string) => void): () => void {
    return this.addListener('onAIImageReceived', callback);
  }

  onPhotoStarted(callback: (event: Record<string, unknown>) => void): () => void {
    return this.addListener('onPhotoStarted', callback);
  }

  onPhotoCompleted(callback: (event: Record<string, unknown>) => void): () => void {
    return this.addListener('onPhotoCompleted', callback);
  }

  onPhotoFailed(callback: (event: Record<string, unknown>) => void): () => void {
    return this.addListener('onPhotoFailed', callback);
  }

  onBleNotification(callback: (event: BleNotificationEvent) => void): () => void {
    return this.addListener('onBleNotification', callback);
  }

  onSdkLog(callback: (event: SdkLogEvent) => void): () => void {
    return this.addListener('onSdkLog', callback);
  }

  onSdkError(callback: (event: Record<string, unknown>) => void): () => void {
    return this.addListener('onSdkError', callback);
  }

  onError(callback: (error: string) => void): () => void {
    return this.addListener<{ message?: string } | string>('onError', (event) => {
      callback(typeof event === 'string' ? event : event.message ?? 'Unknown HeyCyan SDK error');
    });
  }
}

export default new HeyCyanManager();
