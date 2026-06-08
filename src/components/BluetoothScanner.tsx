// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Platform,
//   PermissionsAndroid,
//   Image,
//   ScrollView,
//   Modal,
//   ActivityIndicator,
//   SafeAreaView,
//   RefreshControl,
// } from 'react-native';
// import { BleManager, Device } from 'react-native-ble-plx';
// import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';
// import HeyCyanManager from '../native/HeyCyanModule';
// import { HeyCyanDevice, BatteryStatus, MediaCounts, CapturedPhoto } from '../native/HeyCyanTypes';

// // Import your database service (you can replace this with your actual backend)
// // For now, I'll create a mock database service
// import { DatabaseService } from '../services/DatabaseService';

// const BluetoothScanner = () => {
//   // Generic BLE for scanning all devices
//   const [bleManager] = useState(() => new BleManager());
//   const [isScanning, setIsScanning] = useState(false);
//   const [devices, setDevices] = useState<Device[]>([]);
//   const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  
//   // HeyCyan specific states
//   const [isHeyCyanDevice, setIsHeyCyanDevice] = useState(false);
//   const [heyCyanConnected, setHeyCyanConnected] = useState(false);
//   const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
//   const [mediaCounts, setMediaCounts] = useState<MediaCounts | null>(null);
//   const [isRecording, setIsRecording] = useState<'video' | 'audio' | null>(null);
  
//   // Photo states
//   const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
//   const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showImageModal, setShowImageModal] = useState(false);
//   const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
//   const [refreshing, setRefreshing] = useState(false);

//   useEffect(() => {
//     requestPermissions();
//     checkBluetoothState();
//     requestCameraPermissions();
//     initializeHeyCyanSDK();
//     loadSavedPhotos();

//     return () => {
//       bleManager.destroy();
//     };
//   }, []);

//   // Load saved photos from local storage
//   const loadSavedPhotos = async () => {
//     try {
//       const savedPhotos = await DatabaseService.getPhotos();
//       setCapturedPhotos(savedPhotos);
//     } catch (error) {
//       console.error('Error loading photos:', error);
//     }
//   };

//   // Initialize HeyCyan SDK
//   const initializeHeyCyanSDK = async () => {
//     try {
//       const initialized = await HeyCyanManager.initialize();
//       if (initialized) {
//         console.log('HeyCyan SDK ready');
//         setupHeyCyanListeners();
//       }
//     } catch (error) {
//       console.log('HeyCyan SDK not available');
//     }
//   };

//   const setupHeyCyanListeners = () => {
//     HeyCyanManager.onDeviceConnected((device) => {
//       setHeyCyanConnected(true);
//       fetchHeyCyanInfo();
//       Alert.alert('Success', `HeyCyan Glasses connected: ${device.name}`);
//     });
    
//     HeyCyanManager.onDeviceDisconnected(() => {
//       setHeyCyanConnected(false);
//       setBatteryStatus(null);
//       setMediaCounts(null);
//       Alert.alert('Disconnected', 'HeyCyan Glasses disconnected');
//     });
    
//     HeyCyanManager.onBatteryUpdate((status) => {
//       setBatteryStatus(status);
//     });
    
//     HeyCyanManager.onMediaCountsUpdate((counts) => {
//       setMediaCounts(counts);
//     });
    
//     // IMPORTANT: This is where we receive the photo from glasses
//     HeyCyanManager.onPhotoReceived(async (photoBase64, photoId) => {
//       setIsProcessing(false);
      
//       // Create photo object
//       const newPhoto: CapturedPhoto = {
//         id: photoId,
//         uri: `data:image/jpeg;base64,${photoBase64}`,
//         base64: photoBase64,
//         timestamp: Date.now(),
//         synced: false,
//       };
      
//       // Save to local state
//       setCapturedPhotos(prev => [newPhoto, ...prev]);
      
//       // Save to local storage
//       await DatabaseService.savePhoto(newPhoto);
      
//       Alert.alert(
//         'Photo Captured!', 
//         'Photo taken by HeyCyan Glasses. Would you like to upload it now?',
//         [
//           { text: 'Later', style: 'cancel' },
//           { text: 'Upload', onPress: () => uploadPhotoToServer(newPhoto.id) }
//         ]
//       );
//     });
    
//     HeyCyanManager.onError((error) => {
//       setIsProcessing(false);
//       Alert.alert('Error', error);
//     });
//   };

//   const fetchHeyCyanInfo = async () => {
//     try {
//       const battery = await HeyCyanManager.getBattery();
//       setBatteryStatus(battery);
//       const media = await HeyCyanManager.getMediaCounts();
//       setMediaCounts(media);
//       await HeyCyanManager.syncTime();
//     } catch (error) {
//       console.error('Error fetching HeyCyan info:', error);
//     }
//   };

//   const requestPermissions = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const granted = await PermissionsAndroid.requestMultiple([
//           PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
//           PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
//           PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
//         ]);
        
//         const allGranted = Object.values(granted).every(
//           (status) => status === PermissionsAndroid.RESULTS.GRANTED
//         );
        
//         if (!allGranted) {
//           Alert.alert('Permission Required', 'Bluetooth permissions are needed');
//         }
//       } catch (err) {
//         console.warn(err);
//       }
//     }
//   };

//   const requestCameraPermissions = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const cameraPermission = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.CAMERA
//         );
        
//         if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
//           Alert.alert('Camera Permission', 'Camera permission is needed');
//         }
//       } catch (err) {
//         console.warn(err);
//       }
//     }
//   };

//   const checkBluetoothState = () => {
//     const subscription = bleManager.onStateChange((state) => {
//       if (state === 'PoweredOff') {
//         Alert.alert('Bluetooth Off', 'Please turn on Bluetooth');
//       }
//       subscription.remove();
//     }, true);
//   };

//   // Scan for Bluetooth devices
//   const startDeviceScan = () => {
//     setDevices([]);
//     setIsScanning(true);

//     bleManager.startDeviceScan(null, null, (error, device) => {
//       if (error) {
//         console.error(error);
//         Alert.alert('Scan Error', error.message);
//         setIsScanning(false);
//         return;
//       }

//       if (device && device.name) {
//         setDevices(prevDevices => {
//           if (!prevDevices.some(d => d.id === device.id)) {
//             return [...prevDevices, device];
//           }
//           return prevDevices;
//         });
//       }
//     });

//     setTimeout(() => {
//       bleManager.stopDeviceScan();
//       setIsScanning(false);
//     }, 10000);
//   };

//   // Connect to device
//   const connectToDevice = async (device: Device) => {
//     try {
//       setIsScanning(false);
//       bleManager.stopDeviceScan();

//       const connected = await device.connect();
//       await connected.discoverAllServicesAndCharacteristics();
//       setConnectedDevice(device);
      
//       // Check if it's a HeyCyan device
//       const isHeyCyan = device.name?.toLowerCase().includes('heycyan') || 
//                         device.name?.toLowerCase().includes('glasses') ||
//                         device.name?.toLowerCase().includes('w610') ||
//                         device.name?.toLowerCase().includes('g300');
      
//       setIsHeyCyanDevice(isHeyCyan);
      
//       if (isHeyCyan) {
//         // Connect via HeyCyan SDK
//         try {
//           await HeyCyanManager.connect(device.id);
//         } catch (error) {
//           console.log('Device not compatible with HeyCyan SDK');
//           Alert.alert('Warning', 'Connected but advanced features may not work');
//         }
//       }
      
//       Alert.alert('Connected', `Connected to ${device.name || device.id}`);
//     } catch (error) {
//       console.error('Connection error:', error);
//       Alert.alert('Connection Failed', `Could not connect to ${device.name || device.id}`);
//     }
//   };

//   const disconnectDevice = async () => {
//     if (connectedDevice) {
//       await connectedDevice.cancelConnection();
//       setConnectedDevice(null);
//       setIsHeyCyanDevice(false);
//       setHeyCyanConnected(false);
//       setDevices([]);
//     }
//   };

//   // MAIN FUNCTION: Take photo with HeyCyan Glasses
//   const takePhotoWithGlasses = async () => {
//     if (!heyCyanConnected) {
//       Alert.alert('Not Connected', 'Please connect to HeyCyan Glasses first');
//       return;
//     }
    
//     setIsProcessing(true);
//     Alert.alert('Taking Photo', 'Please look at the glasses camera...');
    
//     try {
//       // This will trigger the glasses to take a photo
//       // The photo will be received via onPhotoReceived callback
//       const success = await HeyCyanManager.takePhoto();
      
//       if (!success) {
//         setIsProcessing(false);
//         Alert.alert('Error', 'Failed to take photo. Please try again.');
//       }
//       // Success case - photo will come through the callback
//     } catch (error) {
//       console.error('Photo capture error:', error);
//       setIsProcessing(false);
//       Alert.alert('Error', 'Failed to capture photo');
//     }
//   };

//   // Upload photo to server/database
//   const uploadPhotoToServer = async (photoId: string) => {
//     const photo = capturedPhotos.find(p => p.id === photoId);
//     if (!photo) {
//       Alert.alert('Error', 'Photo not found');
//       return;
//     }
    
//     setUploadingPhotoId(photoId);
    
//     try {
//       // Upload to your backend server
//       const success = await DatabaseService.uploadPhoto(photo);
      
//       if (success) {
//         // Update local state
//         setCapturedPhotos(prev => 
//           prev.map(p => p.id === photoId ? { ...p, synced: true } : p)
//         );
        
//         // Update local storage
//         await DatabaseService.markPhotoSynced(photoId);
        
//         Alert.alert('Success', 'Photo uploaded to database!');
//       } else {
//         Alert.alert('Error', 'Failed to upload photo');
//       }
//     } catch (error) {
//       console.error('Upload error:', error);
//       Alert.alert('Error', 'Failed to upload photo');
//     } finally {
//       setUploadingPhotoId(null);
//     }
//   };

//   // Upload all unsynced photos
//   const uploadAllPhotos = async () => {
//     const unsyncedPhotos = capturedPhotos.filter(p => !p.synced);
    
//     if (unsyncedPhotos.length === 0) {
//       Alert.alert('Info', 'No photos to upload');
//       return;
//     }
    
//     Alert.alert(
//       'Upload All',
//       `Upload ${unsyncedPhotos.length} photos to database?`,
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Upload',
//           onPress: async () => {
//             for (const photo of unsyncedPhotos) {
//               await uploadPhotoToServer(photo.id);
//             }
//           }
//         }
//       ]
//     );
//   };

//   // Delete photo
//   const deletePhoto = async (photoId: string) => {
//     Alert.alert(
//       'Delete Photo',
//       'Are you sure you want to delete this photo?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive',
//           onPress: async () => {
//             await DatabaseService.deletePhoto(photoId);
//             setCapturedPhotos(prev => prev.filter(p => p.id !== photoId));
//             if (selectedPhoto?.id === photoId) {
//               setSelectedPhoto(null);
//               setShowImageModal(false);
//             }
//           }
//         }
//       ]
//     );
//   };

//   // Refresh photos list
//   const onRefresh = async () => {
//     setRefreshing(true);
//     await loadSavedPhotos();
//     setRefreshing(false);
//   };

//   const renderDevice = ({ item }: { item: Device }) => (
//     <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
//       <View style={styles.deviceIcon}>
//         <Text style={styles.deviceIconText}>
//           {item.name?.toLowerCase().includes('heycyan') || 
//            item.name?.toLowerCase().includes('glasses') ? '👓' : '📱'}
//         </Text>
//       </View>
//       <View style={styles.deviceInfo}>
//         <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
//         <Text style={styles.deviceId}>{item.id}</Text>
//       </View>
//       <View style={styles.deviceSignal}>
//         <Text style={styles.signalText}>🔵</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   const renderPhotoItem = ({ item }: { item: CapturedPhoto }) => (
//     <TouchableOpacity 
//       style={styles.photoCard}
//       onPress={() => {
//         setSelectedPhoto(item);
//         setShowImageModal(true);
//       }}
//     >
//       <Image source={{ uri: item.uri }} style={styles.photoImage} />
//       <View style={styles.photoOverlay}>
//         {item.synced ? (
//           <View style={styles.syncedBadge}>
//             <Text style={styles.syncedText}>✓ Synced</Text>
//           </View>
//         ) : (
//           <TouchableOpacity 
//             style={styles.uploadButton}
//             onPress={() => uploadPhotoToServer(item.id)}
//           >
//             <Text style={styles.uploadButtonText}>Upload</Text>
//           </TouchableOpacity>
//         )}
//         <Text style={styles.photoDate}>
//           {new Date(item.timestamp).toLocaleString()}
//         </Text>
//       </View>
//       {uploadingPhotoId === item.id && (
//         <View style={styles.uploadingOverlay}>
//           <ActivityIndicator size="small" color="#fff" />
//         </View>
//       )}
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView 
//         style={styles.container}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>HeyCyan SmartGlasses</Text>
//           <Text style={styles.headerSubtitle}>Capture & Upload Photos</Text>
//         </View>

//         {/* Bluetooth Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>🔷 Bluetooth Connection</Text>
          
//           {!connectedDevice ? (
//             <>
//               <TouchableOpacity
//                 style={[styles.scanButton, isScanning && styles.scanningButton]}
//                 onPress={startDeviceScan}
//                 disabled={isScanning}
//               >
//                 <Text style={styles.scanButtonText}>
//                   {isScanning ? '🔍 SCANNING...' : '🎯 SCAN FOR GLASSES'}
//                 </Text>
//               </TouchableOpacity>

//               {isScanning && (
//                 <View style={styles.scanningIndicator}>
//                   <ActivityIndicator size="large" color="#007aff" />
//                   <Text style={styles.scanningText}>Looking for HeyCyan Glasses...</Text>
//                   <Text style={styles.scanningHint}>Make sure your glasses are in pairing mode</Text>
//                 </View>
//               )}

//               {devices.length > 0 && (
//                 <>
//                   <Text style={styles.devicesFoundText}>
//                     Found {devices.length} device{devices.length !== 1 ? 's' : ''}
//                   </Text>
//                   <FlatList
//                     data={devices}
//                     renderItem={renderDevice}
//                     keyExtractor={(item) => item.id}
//                     style={styles.deviceList}
//                     scrollEnabled={false}
//                   />
//                 </>
//               )}

//               {!isScanning && devices.length === 0 && (
//                 <View style={styles.emptyState}>
//                   <Text style={styles.emptyIcon}>👓</Text>
//                   <Text style={styles.emptyTitle}>No Glasses Found</Text>
//                   <Text style={styles.emptyText}>
//                     Tap the SCAN button above to discover{'\n'}nearby HeyCyan smart glasses
//                   </Text>
//                 </View>
//               )}
//             </>
//           ) : (
//             <View style={styles.connectedCard}>
//               <View style={styles.connectedHeader}>
//                 <Text style={styles.connectedEmoji}>✅</Text>
//                 <Text style={styles.connectedTitle}>Connected to</Text>
//               </View>
//               <Text style={styles.connectedDeviceName}>
//                 {connectedDevice.name || connectedDevice.id}
//               </Text>
              
//               {heyCyanConnected && batteryStatus && (
//                 <>
//                   <View style={styles.statusRow}>
//                     <Text style={styles.statusLabel}>🔋 Battery:</Text>
//                     <Text style={styles.statusValue}>
//                       {batteryStatus.level}% {batteryStatus.isCharging && '⚡'}
//                     </Text>
//                   </View>
//                   {mediaCounts && (
//                     <View style={styles.statsGrid}>
//                       <View style={styles.statItem}>
//                         <Text style={styles.statNumber}>{mediaCounts.photos}</Text>
//                         <Text style={styles.statLabel}>Photos</Text>
//                       </View>
//                       <View style={styles.statItem}>
//                         <Text style={styles.statNumber}>{mediaCounts.videos}</Text>
//                         <Text style={styles.statLabel}>Videos</Text>
//                       </View>
//                       <View style={styles.statItem}>
//                         <Text style={styles.statNumber}>{mediaCounts.audios}</Text>
//                         <Text style={styles.statLabel}>Audios</Text>
//                       </View>
//                     </View>
//                   )}
//                 </>
//               )}
              
//               <View style={styles.buttonRow}>
//                 <TouchableOpacity 
//                   style={[styles.actionButton, styles.disconnectBtn]} 
//                   onPress={disconnectDevice}
//                 >
//                   <Text style={styles.actionButtonText}>Disconnect</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//         </View>

//         {/* Camera Controls Section - Only when connected to HeyCyan */}
//         {heyCyanConnected && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>📸 Capture with Glasses</Text>
            
//             {/* Main Take Photo Button */}
//             <TouchableOpacity 
//               style={[styles.takePhotoButton, isProcessing && styles.processingBtn]}
//               onPress={takePhotoWithGlasses}
//               disabled={isProcessing}
//             >
//               {isProcessing ? (
//                 <>
//                   <ActivityIndicator size="large" color="#fff" />
//                   <Text style={styles.takePhotoButtonText}>Taking Photo...</Text>
//                 </>
//               ) : (
//                 <>
//                   <Text style={styles.takePhotoIcon}>📷</Text>
//                   <Text style={styles.takePhotoButtonText}>Take Photo with Glasses</Text>
//                 </>
//               )}
//             </TouchableOpacity>

//             <Text style={styles.hintText}>
//               Press the button above - Your HeyCyan Glasses will capture a photo and send it to this app automatically
//             </Text>
//           </View>
//         )}

//         {/* Photos Section - Show captured photos */}
//         {capturedPhotos.length > 0 && (
//           <View style={styles.section}>
//             <View style={styles.photosHeader}>
//               <Text style={styles.sectionTitle}>📱 Captured Photos</Text>
//               <TouchableOpacity 
//                 style={styles.uploadAllButton}
//                 onPress={uploadAllPhotos}
//               >
//                 <Text style={styles.uploadAllText}>Upload All</Text>
//               </TouchableOpacity>
//             </View>
            
//             <FlatList
//               data={capturedPhotos}
//               renderItem={renderPhotoItem}
//               keyExtractor={(item) => item.id}
//               numColumns={2}
//               columnWrapperStyle={styles.photoGrid}
//               scrollEnabled={false}
//             />
//           </View>
//         )}
//       </ScrollView>

//       {/* Image Preview Modal with Upload Option */}
//       <Modal
//         visible={showImageModal}
//         transparent={true}
//         animationType="slide"
//         onRequestClose={() => setShowImageModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <TouchableOpacity 
//               style={styles.modalClose}
//               onPress={() => setShowImageModal(false)}
//             >
//               <Text style={styles.modalCloseText}>✕</Text>
//             </TouchableOpacity>
            
//             {selectedPhoto && (
//               <>
//                 <Image source={{ uri: selectedPhoto.uri }} style={styles.modalImage} />
                
//                 <View style={styles.modalButtons}>
//                   {!selectedPhoto.synced && (
//                     <TouchableOpacity 
//                       style={styles.modalUploadBtn}
//                       onPress={() => {
//                         uploadPhotoToServer(selectedPhoto.id);
//                         setShowImageModal(false);
//                       }}
//                     >
//                       <Text style={styles.modalUploadText}>📤 Upload to Database</Text>
//                     </TouchableOpacity>
//                   )}
                  
//                   <TouchableOpacity 
//                     style={styles.modalDeleteBtn}
//                     onPress={() => deletePhoto(selectedPhoto.id)}
//                   >
//                     <Text style={styles.modalDeleteText}>🗑️ Delete</Text>
//                   </TouchableOpacity>
//                 </View>
                
//                 {selectedPhoto.synced && (
//                   <View style={styles.syncedContainer}>
//                     <Text style={styles.syncedContainerText}>✓ Uploaded to database</Text>
//                   </View>
//                 )}
//               </>
//             )}
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   container: {
//     flex: 1,
//   },
//   header: {
//     backgroundColor: '#fff',
//     paddingVertical: 20,
//     paddingHorizontal: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: '#e0e0e0',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#007aff',
//   },
//   headerSubtitle: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 4,
//   },
//   section: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#f0f0f0',
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     marginBottom: 16,
//     color: '#333',
//   },
//   scanButton: {
//     backgroundColor: '#007aff',
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginBottom: 16,
//     shadowColor: '#007aff',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   scanningButton: {
//     backgroundColor: '#999',
//     opacity: 0.7,
//   },
//   scanButtonText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   scanningIndicator: {
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     marginBottom: 16,
//   },
//   scanningText: {
//     marginTop: 12,
//     fontSize: 14,
//     color: '#007aff',
//     fontWeight: '500',
//   },
//   scanningHint: {
//     marginTop: 4,
//     fontSize: 12,
//     color: '#999',
//   },
//   devicesFoundText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 8,
//     marginTop: 8,
//   },
//   deviceList: {
//     marginTop: 8,
//   },
//   deviceItem: {
//     backgroundColor: 'white',
//     padding: 16,
//     marginVertical: 6,
//     borderRadius: 12,
//     flexDirection: 'row',
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   deviceIcon: {
//     width: 44,
//     height: 44,
//     borderRadius: 22,
//     backgroundColor: '#e3f2fd',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   deviceIconText: {
//     fontSize: 22,
//   },
//   deviceInfo: {
//     flex: 1,
//   },
//   deviceName: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//   },
//   deviceId: {
//     fontSize: 11,
//     color: '#999',
//     marginTop: 2,
//   },
//   deviceSignal: {
//     width: 30,
//     alignItems: 'center',
//   },
//   signalText: {
//     fontSize: 18,
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 40,
//     paddingHorizontal: 20,
//   },
//   emptyIcon: {
//     fontSize: 64,
//     marginBottom: 16,
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#333',
//     marginBottom: 8,
//   },
//   emptyText: {
//     textAlign: 'center',
//     fontSize: 14,
//     color: '#999',
//     lineHeight: 20,
//   },
//   connectedCard: {
//     backgroundColor: '#e8f5e9',
//     padding: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   connectedHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   connectedEmoji: {
//     fontSize: 24,
//     marginRight: 8,
//   },
//   connectedTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#2e7d32',
//   },
//   connectedDeviceName: {
//     fontSize: 16,
//     color: '#333',
//     marginBottom: 12,
//     fontWeight: '500',
//   },
//   statusRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     paddingHorizontal: 20,
//     marginBottom: 8,
//   },
//   statusLabel: {
//     fontSize: 14,
//     color: '#666',
//   },
//   statusValue: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#333',
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     width: '100%',
//     marginVertical: 12,
//   },
//   statItem: {
//     alignItems: 'center',
//   },
//   statNumber: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#007aff',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#666',
//     marginTop: 4,
//   },
//   buttonRow: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 8,
//   },
//   actionButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     minWidth: 120,
//     alignItems: 'center',
//   },
//   disconnectBtn: {
//     backgroundColor: '#ff3b30',
//   },
//   actionButtonText: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   takePhotoButton: {
//     backgroundColor: '#007aff',
//     paddingVertical: 20,
//     borderRadius: 16,
//     alignItems: 'center',
//     marginBottom: 12,
//     shadowColor: '#007aff',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 5,
//   },
//   processingBtn: {
//     opacity: 0.7,
//   },
//   takePhotoIcon: {
//     fontSize: 48,
//     marginBottom: 8,
//   },
//   takePhotoButtonText: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   hintText: {
//     fontSize: 12,
//     color: '#666',
//     textAlign: 'center',
//     marginTop: 8,
//   },
//   photosHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   uploadAllButton: {
//     backgroundColor: '#34c759',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//   },
//   uploadAllText: {
//     color: 'white',
//     fontWeight: '600',
//     fontSize: 12,
//   },
//   photoGrid: {
//     justifyContent: 'space-between',
//   },
//   photoCard: {
//     width: '48%',
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     marginBottom: 12,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   photoImage: {
//     width: '100%',
//     height: 150,
//     resizeMode: 'cover',
//   },
//   photoOverlay: {
//     padding: 8,
//   },
//   syncedBadge: {
//     backgroundColor: '#34c759',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     alignSelf: 'flex-start',
//     marginBottom: 4,
//   },
//   syncedText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: '600',
//   },
//   uploadButton: {
//     backgroundColor: '#007aff',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     alignSelf: 'flex-start',
//     marginBottom: 4,
//   },
//   uploadButtonText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: '600',
//   },
//   photoDate: {
//     fontSize: 10,
//     color: '#999',
//   },
//   uploadingOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.95)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     backgroundColor: '#1a1a1a',
//     borderRadius: 20,
//     width: '90%',
//     maxHeight: '80%',
//     overflow: 'hidden',
//   },
//   modalClose: {
//     position: 'absolute',
//     top: 12,
//     right: 12,
//     zIndex: 1,
//     backgroundColor: 'rgba(0,0,0,0.6)',
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalCloseText: {
//     color: 'white',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   modalImage: {
//     width: '100%',
//     height: 400,
//     resizeMode: 'contain',
//     backgroundColor: '#000',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     padding: 16,
//     gap: 12,
//   },
//   modalUploadBtn: {
//     flex: 1,
//     backgroundColor: '#007aff',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   modalUploadText: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   modalDeleteBtn: {
//     flex: 1,
//     backgroundColor: '#ff3b30',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   modalDeleteText: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   syncedContainer: {
//     padding: 16,
//     alignItems: 'center',
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   syncedContainerText: {
//     color: '#34c759',
//     fontWeight: '600',
//   },
// });

// export default BluetoothScanner;


//==============================================================


import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    requestPermissions();
    checkBluetoothState();
    requestCameraPermissions();
    initializeHeyCyanSDK();
    loadSavedPhotos();

    return () => {
      bleManager.destroy();
      // Remove all listeners when component unmounts
      if (heyCyanListeners) {
        Object.values(heyCyanListeners).forEach(removeListener => removeListener());
      }
    };
  }, []);

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
      const initialized = await HeyCyanManager.initialize();
      if (initialized) {
        console.log('HeyCyan SDK ready');
        setupHeyCyanListeners();
      }
    } catch (error) {
      console.log('HeyCyan SDK initialization error:', error);
    }
  };

  const setupHeyCyanListeners = () => {
    // Store all listeners for cleanup
    const listeners = {
      onDeviceConnected: HeyCyanManager.onDeviceConnected((device) => {
        setHeyCyanConnected(true);
        fetchHeyCyanInfo();
        Alert.alert('Success', `HeyCyan Glasses connected: ${device.name}`);
      }),
      
      onDeviceDisconnected: HeyCyanManager.onDeviceDisconnected(() => {
        setHeyCyanConnected(false);
        setConnectedDevice(null);
        setBatteryStatus(null);
        setMediaCounts(null);
        Alert.alert('Disconnected', 'HeyCyan Glasses disconnected');
      }),
      
      onBatteryUpdate: HeyCyanManager.onBatteryUpdate((status) => {
        setBatteryStatus(status);
      }),
      
      onMediaCountsUpdate: HeyCyanManager.onMediaCountsUpdate((counts) => {
        setMediaCounts(counts);
      }),
      
      onPhotoReceived: HeyCyanManager.onPhotoReceived(async (photoBase64, photoId) => {
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
      
      onError: HeyCyanManager.onError((error) => {
        setIsProcessing(false);
        Alert.alert('Error', error);
      })
    };
    
    setHeyCyanListeners(listeners);
  };

  const fetchHeyCyanInfo = async () => {
    try {
      const battery = await HeyCyanManager.getBattery();
      setBatteryStatus(battery);
      const media = await HeyCyanManager.getMediaCounts();
      setMediaCounts(media);
      await HeyCyanManager.syncTime();
    } catch (error) {
      console.error('Error fetching HeyCyan info:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissionsToRequest = [];
        
        // Android 12+ (API 31+)
        if (Platform.Version >= 31) {
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
          );
        } else {
          // Older Android versions
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
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

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(device);
      
      // ALWAYS try to connect via HeyCyan SDK - don't check device name
      try {
        await HeyCyanManager.connect(device.id);
        setHeyCyanConnected(true);
        fetchHeyCyanInfo();
        Alert.alert('Connected', `Connected to ${device.name || device.id}`);
      } catch (error) {
        // Even if SDK connection fails, still show as connected for BLE
        console.log('HeyCyan SDK connection error:', error);
        Alert.alert('Connected', `Connected to ${device.name || device.id} (Basic mode)`);
      }
      
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name || device.id}`);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      try {
        await connectedDevice.cancelConnection();
        await HeyCyanManager.disconnect();
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
    
    setIsProcessing(true);
    Alert.alert('Taking Photo', 'Please look at the glasses camera...');
    
    try {
      // This will trigger the glasses to take a photo
      const success = await HeyCyanManager.takePhoto();
      
      if (!success) {
        setIsProcessing(false);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
      // Success case - photo will come through the callback
    } catch (error) {
      console.error('Photo capture error:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to capture photo');
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