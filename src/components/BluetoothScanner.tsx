


import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Image,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import HeyCyanManager from '../native/HeyCyanModule';
import { HeyCyanDevice, BatteryStatus, MediaCounts, CapturedPhoto } from '../native/HeyCyanTypes';
import { DatabaseService } from '../services/DatabaseService';

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);
const getErrorStack = (error: unknown) => error instanceof Error ? error.stack : undefined;

const BluetoothScanner = () => {
  // Generic BLE for scanning all devices
  const [bleManager] = useState(() => new BleManager());
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  
  // HeyCyan specific states
  const [heyCyanConnected, setHeyCyanConnected] = useState(false);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [mediaCounts, setMediaCounts] = useState<MediaCounts | null>(null);
  const [isRecording, setIsRecording] = useState<'video' | 'audio' | null>(null);
  
  // Photo states
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const heyCyanListenersRef = useRef<Record<string, () => void>>({});
  const photoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoConfirmedRef = useRef(false);

  useEffect(() => {
    console.log('[HeyCyan UI] Component mounted, requesting permissions and initializing SDK');
    requestPermissions();
    checkBluetoothState();
    requestCameraPermissions();
    initializeHeyCyanSDK();
    loadSavedPhotos();

    return () => {
      console.log('[HeyCyan UI] Component unmounting, cleaning up BLE manager/listeners');
      bleManager.destroy();
      if (photoTimeoutRef.current) {
        clearTimeout(photoTimeoutRef.current);
      }
      Object.values(heyCyanListenersRef.current).forEach(removeListener => removeListener());
    };
  }, []);

  const clearPhotoTimeout = () => {
    if (photoTimeoutRef.current) {
      clearTimeout(photoTimeoutRef.current);
      photoTimeoutRef.current = null;
    }
  };

  // Store listeners for cleanup
  const [heyCyanListeners, setHeyCyanListeners] = useState<any>({});

  // Load saved photos from local storage
  const loadSavedPhotos = async () => {
    try {
      const savedPhotos = await DatabaseService.getPhotos();
      setCapturedPhotos(savedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  // Initialize HeyCyan SDK
  const initializeHeyCyanSDK = async () => {
    try {
      console.log('[HeyCyan UI] initializeHeyCyanSDK: calling native initialize()');
      const initialized = await HeyCyanManager.initialize();
      console.log('[HeyCyan UI] initializeHeyCyanSDK result:', initialized);
      if (initialized) {
        console.log('HeyCyan SDK ready');
        setupHeyCyanListeners();
      }
    } catch (error) {
      console.log('HeyCyan SDK initialization error:', error);
    }
  };

  const setupHeyCyanListeners = () => {
    console.log('[HeyCyan UI] setupHeyCyanListeners: registering SDK event callbacks');
    // Store all listeners for cleanup
    const listeners = {
      onDeviceConnected: HeyCyanManager.onDeviceConnected((device) => {
        console.log('[HeyCyan UI] onDeviceConnected:', device);
        setHeyCyanConnected(true);
        fetchHeyCyanInfo();
        Alert.alert('Success', `HeyCyan Glasses connected: ${device.name}`);
      }),
      
      onDeviceDisconnected: HeyCyanManager.onDeviceDisconnected(() => {
        console.log('[HeyCyan UI] onDeviceDisconnected');
        setHeyCyanConnected(false);
        setConnectedDevice(null);
        setBatteryStatus(null);
        setMediaCounts(null);
        Alert.alert('Disconnected', 'HeyCyan Glasses disconnected');
      }),
      
      onBatteryUpdate: HeyCyanManager.onBatteryUpdate((status) => {
        console.log('[HeyCyan UI] onBatteryUpdate:', status);
        setBatteryStatus(status);
      }),
      
      onMediaCountsUpdate: HeyCyanManager.onMediaCountsUpdate((counts) => {
        console.log('[HeyCyan UI] onMediaCountsUpdate:', counts);
        setMediaCounts(counts);
      }),
      
      onPhotoReceived: HeyCyanManager.onPhotoReceived(async (photoBase64, photoId) => {
        console.log('[HeyCyan UI] onPhotoReceived:', {
          photoId,
          base64Length: photoBase64?.length ?? 0,
        });
        clearPhotoTimeout();
        setIsProcessing(false);
        
        // Create photo object
        const newPhoto: CapturedPhoto = {
          id: photoId,
          uri: `data:image/jpeg;base64,${photoBase64}`,
          base64: photoBase64,
          timestamp: Date.now(),
          synced: false,
        };
        
        // Save to local state
        setCapturedPhotos(prev => [newPhoto, ...prev]);
        
        // Save to local storage
        await DatabaseService.savePhoto(newPhoto);
        
        Alert.alert(
          'Photo Captured!', 
          'Photo taken by HeyCyan Glasses. Would you like to upload it now?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Upload', onPress: () => uploadPhotoToServer(newPhoto.id) }
          ]
        );
      }),

      onCaptureStatus: HeyCyanManager.onCaptureStatus((status) => {
        console.log('[HeyCyan UI] onCaptureStatus:', status);
        if (status?.stage === 'captured') {
          clearPhotoTimeout();
          if (!photoConfirmedRef.current) {
            photoConfirmedRef.current = true;
            setIsProcessing(false);
            fetchHeyCyanInfo();
            Alert.alert('Photo Clicked', 'The glasses confirmed the photo was taken.');
          }
        }
      }),
      
      onError: HeyCyanManager.onError((error) => {
        console.log('[HeyCyan UI] onError:', error);
        clearPhotoTimeout();
        photoConfirmedRef.current = false;
        setIsProcessing(false);
        Alert.alert('Error', error);
      })
    };
    
    heyCyanListenersRef.current = listeners;
    setHeyCyanListeners(listeners);
  };

  const fetchHeyCyanInfo = async () => {
    try {
      console.log('[HeyCyan UI] fetchHeyCyanInfo: requesting battery/media/time');
      const battery = await HeyCyanManager.getBattery();
      console.log('[HeyCyan UI] fetchHeyCyanInfo battery result:', battery);
      setBatteryStatus(battery);
      const media = await HeyCyanManager.getMediaCounts();
      console.log('[HeyCyan UI] fetchHeyCyanInfo media result:', media);
      setMediaCounts(media);
      await HeyCyanManager.syncTime();
      console.log('[HeyCyan UI] fetchHeyCyanInfo syncTime complete');
    } catch (error) {
      console.error('Error fetching HeyCyan info:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissionsToRequest: string[] = [];
        
        // Android 12+ (API 31+)
        if (Platform.Version >= 31) {
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
          );
          if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
          }
        } else {
          // Older Android versions
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest as any);
        
        console.log('[HeyCyan UI] requestPermissions results:', granted);
        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          Alert.alert('Permission Required', 'Bluetooth permissions are needed');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        
        if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Camera Permission', 'Camera permission is needed');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const checkBluetoothState = () => {
    const subscription = bleManager.onStateChange((state) => {
      if (state === 'PoweredOff') {
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth');
      }
      subscription.remove();
    }, true);
  };

  // Scan for Bluetooth devices
  const startDeviceScan = () => {
    setDevices([]);
    setIsScanning(true);

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        Alert.alert('Scan Error', error.message);
        setIsScanning(false);
        return;
      }

      if (device && device.name) {
        setDevices(prevDevices => {
          if (!prevDevices.some(d => d.id === device.id)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  // Connect to device
const connectToDevice = async (device: Device) => {
  try {
    setIsScanning(false);
    bleManager.stopDeviceScan();

    console.log('[HeyCyan UI] Selected scanned device:', device.id, device.name);

    // Let the HeyCyan SDK own the GATT connection. Opening a react-native-ble-plx
    // connection first can prevent the SDK from reaching a command-ready session.
    try {
      console.log('[HeyCyan UI] Attempting HeyCyan SDK connection without pre-opening JS BLE GATT...');
      const heyCyanConnected_result = await HeyCyanManager.connect(device.id);
      console.log('[HeyCyan UI] HeyCyan SDK connect result:', heyCyanConnected_result);
      
      if (heyCyanConnected_result) {
        setConnectedDevice(device);
        setHeyCyanConnected(true);
        
        // Wait a bit for SDK to initialize
        setTimeout(async () => {
          console.log('[HeyCyan UI] Fetching HeyCyan info after SDK connection...');
          await fetchHeyCyanInfo();
          
          // Test if photo function works
          const isReady = await testHeyCyanConnection();
          console.log('[HeyCyan UI] HeyCyan command test status:', isReady);
        }, 1000);
        
        Alert.alert('Connected', `Connected to ${device.name || device.id}`);
      } else {
        console.log('[HeyCyan UI] HeyCyan SDK connection returned false; trying basic BLE fallback');
        const connected = await device.connect();
        console.log('[HeyCyan UI] Basic BLE connected');
        await connected.discoverAllServicesAndCharacteristics();
        console.log('[HeyCyan UI] Basic BLE services discovered');
        setConnectedDevice(device);
        setHeyCyanConnected(false);
        Alert.alert('Connected', `Connected to ${device.name || device.id} (Basic mode - SDK photo capture is not ready)`);
      }
    } catch (error) {
      console.error('[HeyCyan UI] HeyCyan SDK connection error details:', error);
      try {
        console.log('[HeyCyan UI] Trying basic BLE fallback after SDK connection error...');
        const connected = await device.connect();
        console.log('[HeyCyan UI] Basic BLE connected');
        await connected.discoverAllServicesAndCharacteristics();
        console.log('[HeyCyan UI] Basic BLE services discovered');
        setConnectedDevice(device);
        setHeyCyanConnected(false);
        Alert.alert('Connected', `Connected to ${device.name || device.id} (Basic mode - SDK photo capture is not ready)`);
      } catch (fallbackError) {
        console.error('[HeyCyan UI] Basic BLE fallback failed:', fallbackError);
        setConnectedDevice(null);
        setHeyCyanConnected(false);
        Alert.alert('Connection Failed', `Could not connect to ${device.name || device.id}: ${getErrorMessage(error) || 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    console.error('Connection error details:', error);
    Alert.alert('Connection Failed', `Could not connect to ${device.name || device.id}: ${getErrorMessage(error) || 'Unknown error'}`);
  }
};




  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        await HeyCyanManager.disconnect();
        const isBlePlxConnected = await connectedDevice.isConnected();
        if (isBlePlxConnected) {
          await connectedDevice.cancelConnection();
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      setConnectedDevice(null);
      setHeyCyanConnected(false);
      setBatteryStatus(null);
      setMediaCounts(null);
      setDevices([]);
    }
  };


  // MAIN FUNCTION: Take photo with HeyCyan Glasses
const takePhotoWithGlasses = async () => {
  if (!connectedDevice) {
    Alert.alert('Not Connected', 'Please connect to glasses first');
    return;
  }

  if (!heyCyanConnected) {
    Alert.alert('SDK Not Connected', 'The glasses are only connected in basic BLE mode. Disconnect and reconnect so the HeyCyan SDK can own the connection.');
    return;
  }
  
  setIsProcessing(true);
  photoConfirmedRef.current = false;
  Alert.alert('Taking Photo', 'Please look at the glasses camera...');
  
  try {
    console.log('=== Taking Photo Debug ===');
    console.log('Connected device:', connectedDevice.id, connectedDevice.name);
    console.log('HeyCyan connected status:', heyCyanConnected);
    
    // Check if HeyCyanManager is available
    if (!HeyCyanManager) {
      console.error('HeyCyanManager is not available');
      clearPhotoTimeout();
      photoConfirmedRef.current = false;
      setIsProcessing(false);
      Alert.alert('Error', 'SDK not available. Please restart the app.');
      return;
    }
    
    console.log('Checking native SDK connection state before capture...');
    const sdkConnected = await HeyCyanManager.isConnected();
    console.log('Native SDK connection state:', sdkConnected);

    if (!sdkConnected) {
      clearPhotoTimeout();
      photoConfirmedRef.current = false;
      setIsProcessing(false);
      Alert.alert('SDK Not Ready', 'Bluetooth is connected, but the HeyCyan SDK session is not ready yet. Disconnect and reconnect the glasses, then try again.');
      return;
    }

    photoTimeoutRef.current = setTimeout(() => {
      console.log('[HeyCyan UI] takePhoto timeout: no capture confirmation received within 15s');
      setIsProcessing(false);
      photoConfirmedRef.current = false;
      Alert.alert('Capture Timeout', 'Photo command was sent, but the glasses did not confirm the photo within 15 seconds.');
      photoTimeoutRef.current = null;
    }, 15000);

    // Try to take photo with more detailed error handling
    console.log('Calling HeyCyanManager.takePhoto()...');
    const success = await HeyCyanManager.takePhoto();
    console.log('takePhoto result:', success);
    
    if (!success) {
      console.log('takePhoto returned false');
      clearPhotoTimeout();
      photoConfirmedRef.current = false;
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
    // Success case is confirmed by onCaptureStatus stage "captured".
  } catch (error) {
    console.error('Photo capture error details:', error);
    console.error('Error message:', getErrorMessage(error));
    console.error('Error stack:', getErrorStack(error));
    clearPhotoTimeout();
    photoConfirmedRef.current = false;
    setIsProcessing(false);
    Alert.alert('Error', `Failed to capture photo: ${getErrorMessage(error) || 'Unknown error'}`);
  }
};

// Test HeyCyan connection
const testHeyCyanConnection = async () => {
  try {
    console.log('Testing HeyCyan connection...');
    
    // Try to get battery info
    const battery = await HeyCyanManager.getBattery();
    console.log('Battery info:', battery);
    
    // Try to get media counts
    const media = await HeyCyanManager.getMediaCounts();
    console.log('Media counts:', media);
    
    return true;
  } catch (error) {
    console.error('HeyCyan connection test failed:', error);
    return false;
  }
};
  // Upload photo to server/database
  const uploadPhotoToServer = async (photoId: string) => {
    const photo = capturedPhotos.find(p => p.id === photoId);
    if (!photo) {
      Alert.alert('Error', 'Photo not found');
      return;
    }
    
    setUploadingPhotoId(photoId);
    
    try {
      // Upload to your backend server
      const success = await DatabaseService.uploadPhoto(photo);
      
      if (success) {
        // Update local state
        setCapturedPhotos(prev => 
          prev.map(p => p.id === photoId ? { ...p, synced: true } : p)
        );
        
        // Update local storage
        await DatabaseService.markPhotoSynced(photoId);
        
        Alert.alert('Success', 'Photo uploaded to database!');
      } else {
        Alert.alert('Error', 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploadingPhotoId(null);
    }
  };

  // Upload all unsynced photos
  const uploadAllPhotos = async () => {
    const unsyncedPhotos = capturedPhotos.filter(p => !p.synced);
    
    if (unsyncedPhotos.length === 0) {
      Alert.alert('Info', 'No photos to upload');
      return;
    }
    
    Alert.alert(
      'Upload All',
      `Upload ${unsyncedPhotos.length} photos to database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upload',
          onPress: async () => {
            for (const photo of unsyncedPhotos) {
              await uploadPhotoToServer(photo.id);
            }
          }
        }
      ]
    );
  };

  // Delete photo
  const deletePhoto = async (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await DatabaseService.deletePhoto(photoId);
            setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
            if (selectedPhoto?.id === photoId) {
              setSelectedPhoto(null);
              setShowImageModal(false);
            }
          }
        }
      ]
    );
  };

  // Refresh photos list
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSavedPhotos();
    setRefreshing(false);
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceIconText}>👓</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <View style={styles.deviceSignal}>
        <Text style={styles.signalText}>🔵</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPhotoItem = ({ item }: { item: CapturedPhoto }) => (
    <TouchableOpacity 
      style={styles.photoCard}
      onPress={() => {
        setSelectedPhoto(item);
        setShowImageModal(true);
      }}
    >
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
      <View style={styles.photoOverlay}>
        {item.synced ? (
          <View style={styles.syncedBadge}>
            <Text style={styles.syncedText}>✓ Synced</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={() => uploadPhotoToServer(item.id)}
          >
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.photoDate}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      {uploadingPhotoId === item.id && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>HeyCyan SmartGlasses</Text>
          <Text style={styles.headerSubtitle}>Capture & Upload Photos</Text>
        </View>

        {/* Bluetooth Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔷 Bluetooth Connection</Text>
          
          {!connectedDevice ? (
            <>
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanningButton]}
                onPress={startDeviceScan}
                disabled={isScanning}
              >
                <Text style={styles.scanButtonText}>
                  {isScanning ? '🔍 SCANNING...' : '🎯 SCAN FOR GLASSES'}
                </Text>
              </TouchableOpacity>

              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color="#007aff" />
                  <Text style={styles.scanningText}>Looking for HeyCyan Glasses...</Text>
                  <Text style={styles.scanningHint}>Make sure your glasses are in pairing mode</Text>
                </View>
              )}

              {devices.length > 0 && (
                <>
                  <Text style={styles.devicesFoundText}>
                    Found {devices.length} device{devices.length !== 1 ? 's' : ''}
                  </Text>
                  <FlatList
                    data={devices}
                    renderItem={renderDevice}
                    keyExtractor={(item) => item.id}
                    style={styles.deviceList}
                    scrollEnabled={false}
                  />
                </>
              )}

              {!isScanning && devices.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>👓</Text>
                  <Text style={styles.emptyTitle}>No Glasses Found</Text>
                  <Text style={styles.emptyText}>
                    Tap the SCAN button above to discover{'\n'}nearby HeyCyan smart glasses
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <Text style={styles.connectedEmoji}>✅</Text>
                <Text style={styles.connectedTitle}>Connected to</Text>
              </View>
              <Text style={styles.connectedDeviceName}>
                {connectedDevice.name || connectedDevice.id}
              </Text>
              
              {/* Battery status if available */}
              {batteryStatus && (
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>🔋 Battery:</Text>
                  <Text style={styles.statusValue}>
                    {batteryStatus.level}% {batteryStatus.isCharging && '⚡'}
                  </Text>
                </View>
              )}
              
              {/* Media counts if available */}
              {mediaCounts && (
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{mediaCounts.photos}</Text>
                    <Text style={styles.statLabel}>Photos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{mediaCounts.videos}</Text>
                    <Text style={styles.statLabel}>Videos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{mediaCounts.audios}</Text>
                    <Text style={styles.statLabel}>Audios</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.disconnectBtn]} 
                  onPress={disconnectDevice}
                >
                  <Text style={styles.actionButtonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Camera Controls Section - ALWAYS SHOW WHEN CONNECTED */}
        {connectedDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Capture with Glasses</Text>
            
            {/* Main Take Photo Button */}
            <TouchableOpacity 
              style={[styles.takePhotoButton, isProcessing && styles.processingBtn]}
              onPress={takePhotoWithGlasses}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.takePhotoButtonText}>Taking Photo...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.takePhotoIcon}>📷</Text>
                  <Text style={styles.takePhotoButtonText}>Take Photo with Glasses</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.hintText}>
              Press the button above - Your HeyCyan Glasses will capture a photo and send it to this app automatically
            </Text>
          </View>
        )}

        {/* Photos Section - Show captured photos */}
        {capturedPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.photosHeader}>
              <Text style={styles.sectionTitle}>📱 Captured Photos</Text>
              <TouchableOpacity 
                style={styles.uploadAllButton}
                onPress={uploadAllPhotos}
              >
                <Text style={styles.uploadAllText}>Upload All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={capturedPhotos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.photoGrid}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal with Upload Option */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            {selectedPhoto && (
              <>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} />
                
                <View style={styles.modalButtons}>
                  {!selectedPhoto.synced && (
                    <TouchableOpacity 
                      style={styles.modalUploadBtn}
                      onPress={() => {
                        uploadPhotoToServer(selectedPhoto.id);
                        setShowImageModal(false);
                      }}
                    >
                      <Text style={styles.modalUploadText}>📤 Upload to Database</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.modalDeleteBtn}
                    onPress={() => deletePhoto(selectedPhoto.id)}
                  >
                    <Text style={styles.modalDeleteText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
                
                {selectedPhoto.synced && (
                  <View style={styles.syncedContainer}>
                    <Text style={styles.syncedContainerText}>✓ Uploaded to database</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007aff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanningButton: {
    backgroundColor: '#999',
    opacity: 0.7,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanningIndicator: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  scanningText: {
    marginTop: 12,
    fontSize: 14,
    color: '#007aff',
    fontWeight: '500',
  },
  scanningHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
  },
  devicesFoundText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  deviceList: {
    marginTop: 8,
  },
  deviceItem: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 22,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  deviceSignal: {
    width: 30,
    alignItems: 'center',
  },
  signalText: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  connectedCard: {
    backgroundColor: '#e8f5e9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectedEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  connectedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2e7d32',
  },
  connectedDeviceName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007aff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  disconnectBtn: {
    backgroundColor: '#ff3b30',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  takePhotoButton: {
    backgroundColor: '#007aff',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  processingBtn: {
    opacity: 0.7,
  },
  takePhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  takePhotoButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadAllButton: {
    backgroundColor: '#34c759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadAllText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  photoGrid: {
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  photoOverlay: {
    padding: 8,
  },
  syncedBadge: {
    backgroundColor: '#34c759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  syncedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  photoDate: {
    fontSize: 10,
    color: '#999',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 400,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalUploadBtn: {
    flex: 1,
    backgroundColor: '#007aff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalUploadText: {
    color: 'white',
    fontWeight: '600',
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: '#ff3b30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: 'white',
    fontWeight: '600',
  },
  syncedContainer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  syncedContainerText: {
    color: '#34c759',
    fontWeight: '600',
  },
});

export default BluetoothScanner;
