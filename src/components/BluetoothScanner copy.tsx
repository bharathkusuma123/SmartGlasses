// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   Button,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Platform,
//   PermissionsAndroid,
// } from 'react-native';
// import { BleManager, Device } from 'react-native-ble-plx';

// const BluetoothScanner = () => {
//   const [bleManager] = useState(() => new BleManager());
//   const [isScanning, setIsScanning] = useState(false);
//   const [devices, setDevices] = useState<Device[]>([]);
//   const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

//   useEffect(() => {
//     requestPermissions();
//     checkBluetoothState();

//     return () => {
//       bleManager.destroy();
//     };
//   }, []);

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
//           Alert.alert('Permission Required', 'Bluetooth permissions are needed to scan for devices');
//         }
//       } catch (err) {
//         console.warn(err);
//       }
//     }
//   };

//   const checkBluetoothState = () => {
//     const subscription = bleManager.onStateChange((state) => {
//       if (state === 'PoweredOff') {
//         Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to use SmartGlasses');
//       }
//       subscription.remove();
//     }, true);
//   };

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

//     // Stop scanning after 10 seconds
//     setTimeout(() => {
//       bleManager.stopDeviceScan();
//       setIsScanning(false);
//     }, 10000);
//   };

//   const connectToDevice = async (device: Device) => {
//     try {
//       setIsScanning(false);
//       bleManager.stopDeviceScan();

//       const connected = await device.connect();
//       await connected.discoverAllServicesAndCharacteristics();
//       setConnectedDevice(device);
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
//     }
//   };

//   const renderDevice = ({ item }: { item: Device }) => (
//     <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
//       <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
//       <Text style={styles.deviceId}>{item.id}</Text>
//     </TouchableOpacity>
//   );

//   return (
//     <View style={styles.container}>
//       {connectedDevice ? (
//         <View style={styles.connectedContainer}>
//           <Text style={styles.connectedTitle}>✅ Connected to:</Text>
//           <Text style={styles.deviceName}>{connectedDevice.name || connectedDevice.id}</Text>
//           <View style={styles.buttonSpacing}>
//             <Button title="Disconnect" onPress={disconnectDevice} color="#ff4444" />
//           </View>
//           <Button title="Scan New Device" onPress={() => setConnectedDevice(null)} />
//         </View>
//       ) : (
//         <>
//           <Button
//             title={isScanning ? 'Scanning...' : '🔍 Scan for Bluetooth Devices'}
//             onPress={startDeviceScan}
//             disabled={isScanning}
//           />

//           {isScanning && <Text style={styles.scanningText}>Scanning for devices...</Text>}

//           <FlatList
//             data={devices}
//             renderItem={renderDevice}
//             keyExtractor={(item) => item.id}
//             style={styles.deviceList}
//             ListEmptyComponent={
//               !isScanning && devices.length === 0 ? (
//                 <Text style={styles.emptyText}>
//                   No devices found. Press the button above to start scanning.
//                 </Text>
//               ) : null
//             }
//           />
//         </>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   deviceList: {
//     marginTop: 20,
//   },
//   deviceItem: {
//     backgroundColor: 'white',
//     padding: 15,
//     marginVertical: 8,
//     borderRadius: 8,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 2,
//   },
//   deviceName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   deviceId: {
//     fontSize: 12,
//     color: '#666',
//     marginTop: 4,
//   },
//   scanningText: {
//     textAlign: 'center',
//     marginTop: 20,
//     color: '#007aff',
//   },
//   emptyText: {
//     textAlign: 'center',
//     marginTop: 40,
//     color: '#999',
//   },
//   connectedContainer: {
//     alignItems: 'center',
//     marginTop: 50,
//   },
//   connectedTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 10,
//   },
//   buttonSpacing: {
//     marginVertical: 10,
//     width: '100%',
//   },
// });

// export default BluetoothScanner;



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
// } from 'react-native';
// import { BleManager, Device } from 'react-native-ble-plx';
// import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';

// const BluetoothScanner = () => {
//   const [bleManager] = useState(() => new BleManager());
//   const [isScanning, setIsScanning] = useState(false);
//   const [devices, setDevices] = useState<Device[]>([]);
//   const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  
//   // Photo states
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showImageModal, setShowImageModal] = useState(false);
//   const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

//   useEffect(() => {
//     requestPermissions();
//     checkBluetoothState();
//     requestCameraPermissions();

//     return () => {
//       bleManager.destroy();
//     };
//   }, []);

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
//           Alert.alert('Permission Required', 'Bluetooth permissions are needed to scan for devices');
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
//         const storagePermission = await PermissionsAndroid.request(
//           PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
//         );
        
//         if (cameraPermission !== PermissionsAndroid.RESULTS.GRANTED) {
//           Alert.alert('Camera Permission', 'Camera permission is needed to take photos');
//         }
//       } catch (err) {
//         console.warn(err);
//       }
//     }
//   };

//   const checkBluetoothState = () => {
//     const subscription = bleManager.onStateChange((state) => {
//       if (state === 'PoweredOff') {
//         Alert.alert('Bluetooth Off', 'Please turn on Bluetooth to use SmartGlasses');
//       }
//       subscription.remove();
//     }, true);
//   };

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

//     // Stop scanning after 10 seconds
//     setTimeout(() => {
//       bleManager.stopDeviceScan();
//       setIsScanning(false);
//     }, 10000);
//   };

//   const connectToDevice = async (device: Device) => {
//     try {
//       setIsScanning(false);
//       bleManager.stopDeviceScan();

//       const connected = await device.connect();
//       await connected.discoverAllServicesAndCharacteristics();
//       setConnectedDevice(device);
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
//       setDevices([]); // Clear devices list
//     }
//   };

//   const takePhoto = async () => {
//     try {
//       const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
//       if (status !== 'granted') {
//         Alert.alert('Permission Denied', 'Camera permission is required to take photos');
//         return;
//       }

//       const result = await ImagePicker.launchCameraAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         quality: 0.8,
//         base64: true,
//       });

//       if (!result.canceled && result.assets[0]) {
//         const photoUri = result.assets[0].uri;
//         setSelectedImage(photoUri);
//         setCapturedPhotos(prev => [photoUri, ...prev]);
//         setShowImageModal(true);
        
//         if (connectedDevice) {
//           sendPhotoToDevice(photoUri);
//         } else {
//           Alert.alert('Info', 'Photo taken! Connect to a Bluetooth device to share photos.');
//         }
//       }
//     } catch (error) {
//       console.error('Error taking photo:', error);
//       Alert.alert('Error', 'Failed to take photo');
//     }
//   };

//   const pickFromGallery = async () => {
//     try {
//       const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
//       if (status !== 'granted') {
//         Alert.alert('Permission Denied', 'Gallery permission is required to access photos');
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         quality: 0.8,
//         base64: true,
//       });

//       if (!result.canceled && result.assets[0]) {
//         const photoUri = result.assets[0].uri;
//         setSelectedImage(photoUri);
//         setCapturedPhotos(prev => [photoUri, ...prev]);
//         setShowImageModal(true);
        
//         if (connectedDevice) {
//           sendPhotoToDevice(photoUri);
//         } else {
//           Alert.alert('Info', 'Photo selected! Connect to a Bluetooth device to share photos.');
//         }
//       }
//     } catch (error) {
//       console.error('Error picking from gallery:', error);
//       Alert.alert('Error', 'Failed to pick image from gallery');
//     }
//   };

//   const sendPhotoToDevice = async (uri: string) => {
//     setIsProcessing(true);
    
//     try {
//       const base64 = await FileSystem.readAsStringAsync(uri, {
//         encoding: FileSystem.EncodingType.Base64,
//       });
      
//       // Simulate Bluetooth transfer
//       setTimeout(() => {
//         setIsProcessing(false);
//         Alert.alert(
//           'Success', 
//           `Photo sent to ${connectedDevice?.name || 'device'}!\nSize: ${(base64.length * 0.75 / 1024).toFixed(2)} KB`
//         );
//       }, 2000);
      
//     } catch (error) {
//       console.error('Error sending photo:', error);
//       setIsProcessing(false);
//       Alert.alert('Error', 'Failed to send photo via Bluetooth');
//     }
//   };

//   const deletePhoto = (index: number) => {
//     Alert.alert(
//       'Delete Photo',
//       'Are you sure you want to delete this photo?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive',
//           onPress: () => {
//             setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
//             if (selectedImage === capturedPhotos[index]) {
//               setSelectedImage(null);
//             }
//           }
//         }
//       ]
//     );
//   };

//   const renderDevice = ({ item }: { item: Device }) => (
//     <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
//       <View style={styles.deviceIcon}>
//         <Text style={styles.deviceIconText}>📱</Text>
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

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>SmartGlasses</Text>
//           <Text style={styles.headerSubtitle}>Connect & Capture Moments</Text>
//         </View>

//         {/* Bluetooth Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>🔷 Bluetooth Connection</Text>
          
//           {!connectedDevice ? (
//             <>
//               {/* Scan Button - Always Visible */}
//               <TouchableOpacity
//                 style={[styles.scanButton, isScanning && styles.scanningButton]}
//                 onPress={startDeviceScan}
//                 disabled={isScanning}
//               >
//                 <Text style={styles.scanButtonText}>
//                   {isScanning ? '🔍 SCANNING...' : '🎯 SCAN FOR DEVICES'}
//                 </Text>
//               </TouchableOpacity>

//               {/* Scanning Indicator */}
//               {isScanning && (
//                 <View style={styles.scanningIndicator}>
//                   <ActivityIndicator size="large" color="#007aff" />
//                   <Text style={styles.scanningText}>Searching for Bluetooth devices...</Text>
//                   <Text style={styles.scanningHint}>Make sure your device is discoverable</Text>
//                 </View>
//               )}

//               {/* Devices List */}
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

//               {/* Empty State */}
//               {!isScanning && devices.length === 0 && (
//                 <View style={styles.emptyState}>
//                   <Text style={styles.emptyIcon}>🔍</Text>
//                   <Text style={styles.emptyTitle}>No Devices Found</Text>
//                   <Text style={styles.emptyText}>
//                     Tap the SCAN button above to discover{'\n'}nearby Bluetooth devices
//                   </Text>
//                 </View>
//               )}
//             </>
//           ) : (
//             // Connected Device View
//             <View style={styles.connectedCard}>
//               <View style={styles.connectedHeader}>
//                 <Text style={styles.connectedEmoji}>✅</Text>
//                 <Text style={styles.connectedTitle}>Connected</Text>
//               </View>
//               <Text style={styles.connectedDeviceName}>
//                 {connectedDevice.name || connectedDevice.id}
//               </Text>
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

//         {/* Camera Section - Only when connected */}
//         {connectedDevice && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>📸 Capture & Share</Text>
            
//             <View style={styles.photoButtonsRow}>
//               <TouchableOpacity style={[styles.photoActionBtn, styles.cameraBtn]} onPress={takePhoto}>
//                 <Text style={styles.photoActionIcon}>📷</Text>
//                 <Text style={styles.photoActionText}>Take Photo</Text>
//               </TouchableOpacity>
              
//               <TouchableOpacity style={[styles.photoActionBtn, styles.galleryBtn]} onPress={pickFromGallery}>
//                 <Text style={styles.photoActionIcon}>🖼️</Text>
//                 <Text style={styles.photoActionText}>Gallery</Text>
//               </TouchableOpacity>
//             </View>

//             {isProcessing && (
//               <View style={styles.processingOverlay}>
//                 <ActivityIndicator size="large" color="#007aff" />
//                 <Text style={styles.processingText}>Sending to device...</Text>
//               </View>
//             )}

//             {/* Recent Photos */}
//             {capturedPhotos.length > 0 && (
//               <View style={styles.recentSection}>
//                 <Text style={styles.recentTitle}>Recent Photos ({capturedPhotos.length})</Text>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
//                   {capturedPhotos.map((photo, index) => (
//                     <TouchableOpacity
//                       key={index}
//                       style={styles.photoThumbnail}
//                       onPress={() => {
//                         setSelectedImage(photo);
//                         setShowImageModal(true);
//                       }}
//                       onLongPress={() => deletePhoto(index)}
//                     >
//                       <Image source={{ uri: photo }} style={styles.thumbnailImage} />
//                       <TouchableOpacity 
//                         style={styles.thumbnailDelete}
//                         onPress={() => deletePhoto(index)}
//                       >
//                         <Text style={styles.thumbnailDeleteText}>✕</Text>
//                       </TouchableOpacity>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             )}
//           </View>
//         )}
//       </ScrollView>

//       {/* Image Preview Modal */}
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
            
//             {selectedImage && (
//               <>
//                 <Image source={{ uri: selectedImage }} style={styles.modalImage} />
//                 <TouchableOpacity 
//                   style={styles.modalSendBtn}
//                   onPress={() => sendPhotoToDevice(selectedImage)}
//                 >
//                   <Text style={styles.modalSendText}>Send to Device</Text>
//                 </TouchableOpacity>
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
//     marginBottom: 12,
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
//     marginBottom: 16,
//     fontWeight: '500',
//   },
//   buttonRow: {
//     flexDirection: 'row',
//     gap: 12,
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
//   photoButtonsRow: {
//     flexDirection: 'row',
//     gap: 12,
//     marginBottom: 20,
//   },
//   photoActionBtn: {
//     flex: 1,
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     backgroundColor: 'white',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   cameraBtn: {
//     backgroundColor: '#007aff',
//   },
//   galleryBtn: {
//     backgroundColor: '#34c759',
//   },
//   photoActionIcon: {
//     fontSize: 32,
//     marginBottom: 8,
//   },
//   photoActionText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: 'white',
//   },
//   processingOverlay: {
//     backgroundColor: '#fff',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   processingText: {
//     marginTop: 8,
//     fontSize: 14,
//     color: '#007aff',
//   },
//   recentSection: {
//     marginTop: 8,
//   },
//   recentTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//     color: '#333',
//   },
//   photoScroll: {
//     flexDirection: 'row',
//   },
//   photoThumbnail: {
//     marginRight: 12,
//     position: 'relative',
//   },
//   thumbnailImage: {
//     width: 80,
//     height: 80,
//     borderRadius: 12,
//   },
//   thumbnailDelete: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: '#ff3b30',
//     borderRadius: 12,
//     width: 24,
//     height: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: 'white',
//   },
//   thumbnailDeleteText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
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
//   modalSendBtn: {
//     backgroundColor: '#007aff',
//     padding: 16,
//     margin: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   modalSendText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: '600',
//   },
// });

// export default BluetoothScanner;


// below file is After implementing SDK 


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
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import * as FileSystem from 'expo-file-system';
// import HeyCyanManager from '../native/HeyCyanModule';
// import { HeyCyanDevice, BatteryStatus, MediaCounts, DeviceVersion } from '../native/HeyCyanTypes';

// const BluetoothScanner = () => {
//   // Replace BleManager with HeyCyan SDK
//   const [isScanning, setIsScanning] = useState(false);
//   const [devices, setDevices] = useState<HeyCyanDevice[]>([]);
//   const [connectedDevice, setConnectedDevice] = useState<HeyCyanDevice | null>(null);
  
//   // Device info states
//   const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
//   const [mediaCounts, setMediaCounts] = useState<MediaCounts | null>(null);
//   const [deviceVersion, setDeviceVersion] = useState<DeviceVersion | null>(null);
//   const [isRecording, setIsRecording] = useState<'video' | 'audio' | null>(null);
  
//   // Photo states
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showImageModal, setShowImageModal] = useState(false);
//   const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

//   // Setup HeyCyan SDK
//   useEffect(() => {
//     initializeHeyCyanSDK();
//     requestPermissions();
//     requestCameraPermissions();

//     return () => {
//       // Cleanup
//       if (connectedDevice) {
//         HeyCyanManager.disconnect();
//       }
//     };
//   }, []);

//   const initializeHeyCyanSDK = async () => {
//     try {
//       const initialized = await HeyCyanManager.initialize();
//       if (initialized) {
//         console.log('HeyCyan SDK initialized successfully');
//         setupEventListeners();
//       } else {
//         Alert.alert('SDK Error', 'Failed to initialize HeyCyan SDK');
//       }
//     } catch (error) {
//       console.error('SDK Initialization error:', error);
//       Alert.alert('SDK Error', 'Could not initialize HeyCyan SDK');
//     }
//   };

//   const setupEventListeners = () => {
//     // Listen for discovered devices
//     const deviceDiscoveredListener = HeyCyanManager.onDeviceDiscovered((device) => {
//       setDevices(prevDevices => {
//         if (!prevDevices.some(d => d.id === device.id)) {
//           return [...prevDevices, device];
//         }
//         return prevDevices;
//       });
//     });

//     // Listen for device connection
//     const deviceConnectedListener = HeyCyanManager.onDeviceConnected((device) => {
//       setConnectedDevice(device);
//       setIsScanning(false);
//       Alert.alert('Connected', `Connected to ${device.name}`);
//       fetchDeviceInfo();
//     });

//     // Listen for device disconnection
//     const deviceDisconnectedListener = HeyCyanManager.onDeviceDisconnected((deviceId) => {
//       setConnectedDevice(null);
//       setBatteryStatus(null);
//       setMediaCounts(null);
//       setDeviceVersion(null);
//       Alert.alert('Disconnected', 'Device has been disconnected');
//     });

//     // Listen for battery updates
//     const batteryListener = HeyCyanManager.onBatteryUpdate((status) => {
//       setBatteryStatus(status);
//     });

//     // Listen for media counts updates
//     const mediaCountsListener = HeyCyanManager.onMediaCountsUpdate((counts) => {
//       setMediaCounts(counts);
//     });

//     // Listen for AI generated images
//     const aiImageListener = HeyCyanManager.onAIImageReceived((imageBase64) => {
//       const photoUri = `data:image/jpeg;base64,${imageBase64}`;
//       setCapturedPhotos(prev => [photoUri, ...prev]);
//       Alert.alert('AI Image Generated', 'New AI image received from glasses!');
//     });

//     // Listen for errors
//     const errorListener = HeyCyanManager.onError((error) => {
//       Alert.alert('SDK Error', error);
//     });
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
//           Alert.alert('Permission Required', 'Bluetooth permissions are needed to scan for devices');
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
//           Alert.alert('Camera Permission', 'Camera permission is needed to take photos');
//         }
//       } catch (err) {
//         console.warn(err);
//       }
//     }
//   };

//   const fetchDeviceInfo = async () => {
//     try {
//       // Get battery status
//       const battery = await HeyCyanManager.getBattery();
//       setBatteryStatus(battery);
      
//       // Get media counts
//       const media = await HeyCyanManager.getMediaCounts();
//       setMediaCounts(media);
      
//       // Get version info
//       const version = await HeyCyanManager.getVersionInfo();
//       setDeviceVersion(version);
      
//       // Sync time with device
//       await HeyCyanManager.syncTime();
//     } catch (error) {
//       console.error('Error fetching device info:', error);
//     }
//   };

//   const startDeviceScan = () => {
//     setDevices([]);
//     setIsScanning(true);
//     HeyCyanManager.startScan();

//     // Stop scanning after 15 seconds
//     setTimeout(() => {
//       HeyCyanManager.stopScan();
//       setIsScanning(false);
//     }, 15000);
//   };

//   const connectToDevice = async (device: HeyCyanDevice) => {
//     try {
//       setIsScanning(false);
//       HeyCyanManager.stopScan();
      
//       const connected = await HeyCyanManager.connect(device.id);
//       if (connected) {
//         // Device will be set in the onDeviceConnected event
//       } else {
//         Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
//       }
//     } catch (error) {
//       console.error('Connection error:', error);
//       Alert.alert('Connection Failed', `Could not connect to ${device.name}`);
//     }
//   };

//   const disconnectDevice = async () => {
//     if (connectedDevice) {
//       await HeyCyanManager.disconnect();
//       setConnectedDevice(null);
//       setDevices([]);
//     }
//   };

//   // Camera Controls using HeyCyan SDK
//   const takePhoto = async () => {
//     if (!connectedDevice) {
//       Alert.alert('No Connection', 'Please connect to glasses first');
//       return;
//     }
    
//     try {
//       setIsProcessing(true);
//       const success = await HeyCyanManager.takePhoto();
      
//       if (success) {
//         Alert.alert('Photo Captured', 'Photo taken successfully with glasses!');
//         // Refresh media counts
//         const media = await HeyCyanManager.getMediaCounts();
//         setMediaCounts(media);
//       } else {
//         Alert.alert('Error', 'Failed to take photo');
//       }
//     } catch (error) {
//       console.error('Photo capture error:', error);
//       Alert.alert('Error', 'Failed to capture photo');
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const startVideoRecording = async () => {
//     if (!connectedDevice) {
//       Alert.alert('No Connection', 'Please connect to glasses first');
//       return;
//     }
    
//     try {
//       const success = await HeyCyanManager.startVideo();
//       if (success) {
//         setIsRecording('video');
//         Alert.alert('Recording Started', 'Video recording in progress');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to start video recording');
//     }
//   };

//   const stopVideoRecording = async () => {
//     try {
//       const success = await HeyCyanManager.stopVideo();
//       if (success) {
//         setIsRecording(null);
//         Alert.alert('Recording Stopped', 'Video saved to glasses');
//         const media = await HeyCyanManager.getMediaCounts();
//         setMediaCounts(media);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to stop recording');
//     }
//   };

//   const startAudioRecording = async () => {
//     if (!connectedDevice) {
//       Alert.alert('No Connection', 'Please connect to glasses first');
//       return;
//     }
    
//     try {
//       const success = await HeyCyanManager.startAudio();
//       if (success) {
//         setIsRecording('audio');
//         Alert.alert('Recording Started', 'Audio recording in progress');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to start audio recording');
//     }
//   };

//   const stopAudioRecording = async () => {
//     try {
//       const success = await HeyCyanManager.stopAudio();
//       if (success) {
//         setIsRecording(null);
//         Alert.alert('Recording Stopped', 'Audio saved to glasses');
//         const media = await HeyCyanManager.getMediaCounts();
//         setMediaCounts(media);
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to stop recording');
//     }
//   };

//   const generateAIPhoto = async () => {
//     if (!connectedDevice) {
//       Alert.alert('No Connection', 'Please connect to glasses first');
//       return;
//     }
    
//     try {
//       setIsProcessing(true);
//       const success = await HeyCyanManager.generateAIPhoto();
//       if (success) {
//         Alert.alert('AI Generation', 'AI image generation started. Image will appear when ready.');
//       }
//     } catch (error) {
//       Alert.alert('Error', 'Failed to generate AI photo');
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const pickFromGallery = async () => {
//     try {
//       const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
//       if (status !== 'granted') {
//         Alert.alert('Permission Denied', 'Gallery permission is required to access photos');
//         return;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync({
//         mediaTypes: ImagePicker.MediaTypeOptions.Images,
//         allowsEditing: true,
//         quality: 0.8,
//         base64: true,
//       });

//       if (!result.canceled && result.assets[0]) {
//         const photoUri = result.assets[0].uri;
//         setSelectedImage(photoUri);
//         setCapturedPhotos(prev => [photoUri, ...prev]);
//         setShowImageModal(true);
//       }
//     } catch (error) {
//       console.error('Error picking from gallery:', error);
//       Alert.alert('Error', 'Failed to pick image from gallery');
//     }
//   };

//   const deletePhoto = (index: number) => {
//     Alert.alert(
//       'Delete Photo',
//       'Are you sure you want to delete this photo?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         { 
//           text: 'Delete', 
//           style: 'destructive',
//           onPress: () => {
//             setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
//             if (selectedImage === capturedPhotos[index]) {
//               setSelectedImage(null);
//             }
//           }
//         }
//       ]
//     );
//   };

//   const renderDevice = ({ item }: { item: HeyCyanDevice }) => (
//     <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
//       <View style={styles.deviceIcon}>
//         <Text style={styles.deviceIconText}>👓</Text>
//       </View>
//       <View style={styles.deviceInfo}>
//         <Text style={styles.deviceName}>{item.name || 'HeyCyan Glasses'}</Text>
//         <Text style={styles.deviceId}>MAC: {item.macAddress}</Text>
//         <Text style={styles.deviceSignal}>Signal: {item.rssi} dBm</Text>
//       </View>
//       <View style={styles.deviceSignal}>
//         <Text style={styles.signalText}>🔵</Text>
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.headerTitle}>HeyCyan SmartGlasses</Text>
//           <Text style={styles.headerSubtitle}>Connect & Control Your Glasses</Text>
//         </View>

//         {/* Bluetooth Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>🔷 Device Connection</Text>
          
//           {!connectedDevice ? (
//             <>
//               <TouchableOpacity
//                 style={[styles.scanButton, isScanning && styles.scanningButton]}
//                 onPress={startDeviceScan}
//                 disabled={isScanning}
//               >
//                 <Text style={styles.scanButtonText}>
//                   {isScanning ? '🔍 SCANNING FOR GLASSES...' : '🎯 SCAN FOR HEYCYAN GLASSES'}
//                 </Text>
//               </TouchableOpacity>

//               {isScanning && (
//                 <View style={styles.scanningIndicator}>
//                   <ActivityIndicator size="large" color="#007aff" />
//                   <Text style={styles.scanningText}>Looking for HeyCyan glasses...</Text>
//                   <Text style={styles.scanningHint}>Make sure your glasses are in pairing mode</Text>
//                 </View>
//               )}

//               {devices.length > 0 && (
//                 <>
//                   <Text style={styles.devicesFoundText}>
//                     Found {devices.length} HeyCyan device{devices.length !== 1 ? 's' : ''}
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
//             // Connected Device View with Device Info
//             <View style={styles.connectedContainer}>
//               <View style={styles.connectedCard}>
//                 <View style={styles.connectedHeader}>
//                   <Text style={styles.connectedEmoji}>✅</Text>
//                   <Text style={styles.connectedTitle}>Connected to</Text>
//                 </View>
//                 <Text style={styles.connectedDeviceName}>
//                   {connectedDevice.name}
//                 </Text>
//                 <Text style={styles.connectedMac}>MAC: {connectedDevice.macAddress}</Text>
                
//                 {/* Device Status */}
//                 {batteryStatus && (
//                   <View style={styles.statusRow}>
//                     <Text style={styles.statusLabel}>🔋 Battery:</Text>
//                     <Text style={styles.statusValue}>
//                       {batteryStatus.level}% {batteryStatus.isCharging && '⚡ Charging'}
//                     </Text>
//                   </View>
//                 )}
                
//                 {mediaCounts && (
//                   <View style={styles.statsGrid}>
//                     <View style={styles.statItem}>
//                       <Text style={styles.statNumber}>{mediaCounts.photos}</Text>
//                       <Text style={styles.statLabel}>Photos</Text>
//                     </View>
//                     <View style={styles.statItem}>
//                       <Text style={styles.statNumber}>{mediaCounts.videos}</Text>
//                       <Text style={styles.statLabel}>Videos</Text>
//                     </View>
//                     <View style={styles.statItem}>
//                       <Text style={styles.statNumber}>{mediaCounts.audios}</Text>
//                       <Text style={styles.statLabel}>Audios</Text>
//                     </View>
//                   </View>
//                 )}
                
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

//         {/* Camera & Recording Controls - Only when connected */}
//         {connectedDevice && (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>📸 Capture Controls</Text>
            
//             <View style={styles.controlsGrid}>
//               <TouchableOpacity style={[styles.controlBtn, styles.photoBtn]} onPress={takePhoto}>
//                 <Text style={styles.controlIcon}>📷</Text>
//                 <Text style={styles.controlText}>Take Photo</Text>
//               </TouchableOpacity>
              
//               {isRecording === 'video' ? (
//                 <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={stopVideoRecording}>
//                   <Text style={styles.controlIcon}>⏹️</Text>
//                   <Text style={styles.controlText}>Stop Video</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity style={[styles.controlBtn, styles.videoBtn]} onPress={startVideoRecording}>
//                   <Text style={styles.controlIcon}>🎥</Text>
//                   <Text style={styles.controlText}>Record Video</Text>
//                 </TouchableOpacity>
//               )}
              
//               {isRecording === 'audio' ? (
//                 <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={stopAudioRecording}>
//                   <Text style={styles.controlIcon}>⏹️</Text>
//                   <Text style={styles.controlText}>Stop Audio</Text>
//                 </TouchableOpacity>
//               ) : (
//                 <TouchableOpacity style={[styles.controlBtn, styles.audioBtn]} onPress={startAudioRecording}>
//                   <Text style={styles.controlIcon}>🎙️</Text>
//                   <Text style={styles.controlText}>Record Audio</Text>
//                 </TouchableOpacity>
//               )}
              
//               <TouchableOpacity style={[styles.controlBtn, styles.aiBtn]} onPress={generateAIPhoto}>
//                 <Text style={styles.controlIcon}>🤖</Text>
//                 <Text style={styles.controlText}>AI Photo</Text>
//               </TouchableOpacity>
//             </View>

//             {/* Gallery Button */}
//             <TouchableOpacity style={styles.galleryFullBtn} onPress={pickFromGallery}>
//               <Text style={styles.galleryFullIcon}>🖼️</Text>
//               <Text style={styles.galleryFullText}>Pick from Gallery</Text>
//             </TouchableOpacity>

//             {isProcessing && (
//               <View style={styles.processingOverlay}>
//                 <ActivityIndicator size="large" color="#007aff" />
//                 <Text style={styles.processingText}>Processing...</Text>
//               </View>
//             )}

//             {/* Recent Photos */}
//             {capturedPhotos.length > 0 && (
//               <View style={styles.recentSection}>
//                 <Text style={styles.recentTitle}>Recent Photos ({capturedPhotos.length})</Text>
//                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
//                   {capturedPhotos.map((photo, index) => (
//                     <TouchableOpacity
//                       key={index}
//                       style={styles.photoThumbnail}
//                       onPress={() => {
//                         setSelectedImage(photo);
//                         setShowImageModal(true);
//                       }}
//                       onLongPress={() => deletePhoto(index)}
//                     >
//                       <Image source={{ uri: photo }} style={styles.thumbnailImage} />
//                       <TouchableOpacity 
//                         style={styles.thumbnailDelete}
//                         onPress={() => deletePhoto(index)}
//                       >
//                         <Text style={styles.thumbnailDeleteText}>✕</Text>
//                       </TouchableOpacity>
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             )}
//           </View>
//         )}
//       </ScrollView>

//       {/* Image Preview Modal */}
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
            
//             {selectedImage && (
//               <>
//                 <Image source={{ uri: selectedImage }} style={styles.modalImage} />
//                 <Text style={styles.modalHint}>Swipe down to close</Text>
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
//     color: '#666',
//     marginTop: 2,
//   },
//   deviceSignal: {
//     fontSize: 11,
//     color: '#999',
//     marginTop: 2,
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
//   connectedContainer: {
//     marginTop: 8,
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
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 4,
//   },
//   connectedMac: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 16,
//   },
//   statusRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     paddingHorizontal: 20,
//     marginBottom: 12,
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
//     marginVertical: 16,
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
//   actionButton: {
//     paddingVertical: 10,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     minWidth: 120,
//     alignItems: 'center',
//   },
//   disconnectBtn: {
//     backgroundColor: '#ff3b30',
//     marginTop: 8,
//   },
//   actionButtonText: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   controlsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//     marginBottom: 16,
//   },
//   controlBtn: {
//     flex: 1,
//     minWidth: '45%',
//     paddingVertical: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     backgroundColor: 'white',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   photoBtn: {
//     backgroundColor: '#007aff',
//   },
//   videoBtn: {
//     backgroundColor: '#ff9500',
//   },
//   audioBtn: {
//     backgroundColor: '#af52de',
//   },
//   aiBtn: {
//     backgroundColor: '#ff3b30',
//   },
//   stopBtn: {
//     backgroundColor: '#ff3b30',
//   },
//   controlIcon: {
//     fontSize: 28,
//     marginBottom: 8,
//   },
//   controlText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: 'white',
//   },
//   galleryFullBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#34c759',
//     padding: 14,
//     borderRadius: 12,
//     marginVertical: 8,
//     gap: 10,
//   },
//   galleryFullIcon: {
//     fontSize: 24,
//   },
//   galleryFullText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: 'white',
//   },
//   processingOverlay: {
//     backgroundColor: '#fff',
//     padding: 16,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginVertical: 12,
//   },
//   processingText: {
//     marginTop: 8,
//     fontSize: 14,
//     color: '#007aff',
//   },
//   recentSection: {
//     marginTop: 16,
//   },
//   recentTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 12,
//     color: '#333',
//   },
//   photoScroll: {
//     flexDirection: 'row',
//   },
//   photoThumbnail: {
//     marginRight: 12,
//     position: 'relative',
//   },
//   thumbnailImage: {
//     width: 80,
//     height: 80,
//     borderRadius: 12,
//   },
//   thumbnailDelete: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: '#ff3b30',
//     borderRadius: 12,
//     width: 24,
//     height: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: 'white',
//   },
//   thumbnailDeleteText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
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
//   modalHint: {
//     textAlign: 'center',
//     color: '#999',
//     padding: 16,
//     fontSize: 12,
//   },
// });

// export default BluetoothScanner;


// After combining the both Bloototh and Sdk integration code 
//===========================================================

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
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import HeyCyanManager from '../native/HeyCyanModule';
import { HeyCyanDevice, BatteryStatus, MediaCounts } from '../native/HeyCyanTypes';

const BluetoothScanner = () => {
  // Generic BLE for scanning all devices
  const [bleManager] = useState(() => new BleManager());
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  
  // HeyCyan specific states (only for HeyCyan glasses)
  const [isHeyCyanDevice, setIsHeyCyanDevice] = useState(false);
  const [heyCyanConnected, setHeyCyanConnected] = useState(false);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus | null>(null);
  const [mediaCounts, setMediaCounts] = useState<MediaCounts | null>(null);
  const [isRecording, setIsRecording] = useState<'video' | 'audio' | null>(null);
  
  // Photo states (shared)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);

  useEffect(() => {
    requestPermissions();
    checkBluetoothState();
    requestCameraPermissions();
    initializeHeyCyanSDK();

    return () => {
      bleManager.destroy();
    };
  }, []);

  // Initialize HeyCyan SDK (optional - only if needed)
  const initializeHeyCyanSDK = async () => {
    try {
      const initialized = await HeyCyanManager.initialize();
      if (initialized) {
        console.log('HeyCyan SDK ready');
        setupHeyCyanListeners();
      }
    } catch (error) {
      console.log('HeyCyan SDK not available - using generic BLE only');
    }
  };

  const setupHeyCyanListeners = () => {
    HeyCyanManager.onDeviceConnected((device) => {
      setHeyCyanConnected(true);
      fetchHeyCyanInfo();
    });
    
    HeyCyanManager.onDeviceDisconnected(() => {
      setHeyCyanConnected(false);
      setBatteryStatus(null);
      setMediaCounts(null);
    });
    
    HeyCyanManager.onBatteryUpdate((status) => {
      setBatteryStatus(status);
    });
    
    HeyCyanManager.onMediaCountsUpdate((counts) => {
      setMediaCounts(counts);
    });
    
    HeyCyanManager.onAIImageReceived((imageBase64) => {
      const photoUri = `data:image/jpeg;base64,${imageBase64}`;
      setCapturedPhotos(prev => [photoUri, ...prev]);
      Alert.alert('AI Image', 'New AI image received from glasses!');
    });
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
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
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

  // Generic BLE Scanning (shows ALL devices)
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

  // Generic BLE Connection
  const connectToDevice = async (device: Device) => {
    try {
      setIsScanning(false);
      bleManager.stopDeviceScan();

      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(device);
      
      // Check if it's a HeyCyan device (you can check by name or service UUID)
      const isHeyCyan = device.name?.toLowerCase().includes('heycyan') || 
                        device.name?.toLowerCase().includes('glasses');
      setIsHeyCyanDevice(isHeyCyan);
      
      if (isHeyCyan) {
        // Try to connect via HeyCyan SDK as well
        try {
          await HeyCyanManager.connect(device.id);
        } catch (error) {
          console.log('Device not compatible with HeyCyan SDK');
        }
      }
      
      Alert.alert('Connected', `Connected to ${device.name || device.id}`);
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name || device.id}`);
    }
  };

  const disconnectDevice = async () => {
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
      setConnectedDevice(null);
      setIsHeyCyanDevice(false);
      setHeyCyanConnected(false);
      setDevices([]);
    }
  };

  // Generic Photo/Video Functions (works with both)
  const takePhoto = async () => {
    // If HeyCyan device is connected, use glasses camera
    if (heyCyanConnected) {
      try {
        setIsProcessing(true);
        const success = await HeyCyanManager.takePhoto();
        if (success) {
          Alert.alert('Photo Captured', 'Photo taken with HeyCyan glasses!');
          const media = await HeyCyanManager.getMediaCounts();
          setMediaCounts(media);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo with glasses');
      } finally {
        setIsProcessing(false);
      }
    } 
    // Otherwise use phone camera
    else {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets[0]) {
          const photoUri = result.assets[0].uri;
          setSelectedImage(photoUri);
          setCapturedPhotos(prev => [photoUri, ...prev]);
          setShowImageModal(true);
          
          if (connectedDevice) {
            sendPhotoToDevice(photoUri);
          } else {
            Alert.alert('Info', 'Photo taken! Connect to a device to share.');
          }
        }
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setSelectedImage(photoUri);
        setCapturedPhotos(prev => [photoUri, ...prev]);
        setShowImageModal(true);
        
        if (connectedDevice) {
          sendPhotoToDevice(photoUri);
        }
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // HeyCyan specific controls
  const startVideoRecording = async () => {
    if (!heyCyanConnected) {
      Alert.alert('Not Available', 'Video recording only available with HeyCyan glasses');
      return;
    }
    
    try {
      const success = await HeyCyanManager.startVideo();
      if (success) {
        setIsRecording('video');
        Alert.alert('Recording Started', 'Video recording in progress');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start video recording');
    }
  };

  const stopVideoRecording = async () => {
    try {
      const success = await HeyCyanManager.stopVideo();
      if (success) {
        setIsRecording(null);
        Alert.alert('Recording Stopped', 'Video saved');
        const media = await HeyCyanManager.getMediaCounts();
        setMediaCounts(media);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const startAudioRecording = async () => {
    if (!heyCyanConnected) {
      Alert.alert('Not Available', 'Audio recording only available with HeyCyan glasses');
      return;
    }
    
    try {
      const success = await HeyCyanManager.startAudio();
      if (success) {
        setIsRecording('audio');
        Alert.alert('Recording Started', 'Audio recording in progress');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const stopAudioRecording = async () => {
    try {
      const success = await HeyCyanManager.stopAudio();
      if (success) {
        setIsRecording(null);
        Alert.alert('Recording Stopped', 'Audio saved');
        const media = await HeyCyanManager.getMediaCounts();
        setMediaCounts(media);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const generateAIPhoto = async () => {
    if (!heyCyanConnected) {
      Alert.alert('Not Available', 'AI photo generation only available with HeyCyan glasses');
      return;
    }
    
    try {
      setIsProcessing(true);
      const success = await HeyCyanManager.generateAIPhoto();
      if (success) {
        Alert.alert('AI Generation', 'Generating AI image...');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate AI photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendPhotoToDevice = async (uri: string) => {
    setIsProcessing(true);
    
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setTimeout(() => {
        setIsProcessing(false);
        Alert.alert(
          'Success', 
          `Photo sent to ${connectedDevice?.name || 'device'}!\nSize: ${(base64.length * 0.75 / 1024).toFixed(2)} KB`
        );
      }, 2000);
      
    } catch (error) {
      console.error('Error sending photo:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to send photo');
    }
  };

  const deletePhoto = (index: number) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
            if (selectedImage === capturedPhotos[index]) {
              setSelectedImage(null);
            }
          }
        }
      ]
    );
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <TouchableOpacity style={styles.deviceItem} onPress={() => connectToDevice(item)}>
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceIconText}>
          {item.name?.toLowerCase().includes('heycyan') || item.name?.toLowerCase().includes('glasses') ? '👓' : '📱'}
        </Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SmartGlasses</Text>
          <Text style={styles.headerSubtitle}>Connect & Capture Moments</Text>
        </View>

        {/* Bluetooth Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔷 Bluetooth Connection</Text>
          
          {!connectedDevice ? (
            <>
              {/* Scan Button */}
              <TouchableOpacity
                style={[styles.scanButton, isScanning && styles.scanningButton]}
                onPress={startDeviceScan}
                disabled={isScanning}
              >
                <Text style={styles.scanButtonText}>
                  {isScanning ? '🔍 SCANNING...' : '🎯 SCAN FOR DEVICES'}
                </Text>
              </TouchableOpacity>

              {/* Scanning Indicator */}
              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color="#007aff" />
                  <Text style={styles.scanningText}>Searching for devices...</Text>
                  <Text style={styles.scanningHint}>Make sure your device is discoverable</Text>
                </View>
              )}

              {/* Devices List */}
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

              {/* Empty State */}
              {!isScanning && devices.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No Devices Found</Text>
                  <Text style={styles.emptyText}>
                    Tap the SCAN button above to discover{'\n'}nearby Bluetooth devices
                  </Text>
                </View>
              )}
            </>
          ) : (
            // Connected Device View
            <View style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <Text style={styles.connectedEmoji}>✅</Text>
                <Text style={styles.connectedTitle}>Connected to</Text>
              </View>
              <Text style={styles.connectedDeviceName}>
                {connectedDevice.name || connectedDevice.id}
              </Text>
              
              {/* Show HeyCyan specific info if available */}
              {heyCyanConnected && batteryStatus && (
                <>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>🔋 Battery:</Text>
                    <Text style={styles.statusValue}>
                      {batteryStatus.level}% {batteryStatus.isCharging && '⚡'}
                    </Text>
                  </View>
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
                </>
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

        {/* Camera Section - Only when connected */}
        {connectedDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {heyCyanConnected ? '📸 HeyCyan Controls' : '📸 Capture & Share'}
            </Text>
            
            {/* Main Controls - Always show photo and gallery */}
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity style={[styles.photoActionBtn, styles.cameraBtn]} onPress={takePhoto}>
                <Text style={styles.photoActionIcon}>📷</Text>
                <Text style={styles.photoActionText}>
                  {heyCyanConnected ? 'Take Photo (Glasses)' : 'Take Photo (Phone)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.photoActionBtn, styles.galleryBtn]} onPress={pickFromGallery}>
                <Text style={styles.photoActionIcon}>🖼️</Text>
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* HeyCyan Advanced Controls - Only for HeyCyan devices */}
            {heyCyanConnected && (
              <>
                <View style={styles.advancedControls}>
                  <Text style={styles.advancedTitle}>Advanced Controls</Text>
                  <View style={styles.controlsGrid}>
                    {isRecording === 'video' ? (
                      <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={stopVideoRecording}>
                        <Text style={styles.controlIcon}>⏹️</Text>
                        <Text style={styles.controlText}>Stop Video</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.controlBtn, styles.videoBtn]} onPress={startVideoRecording}>
                        <Text style={styles.controlIcon}>🎥</Text>
                        <Text style={styles.controlText}>Record Video</Text>
                      </TouchableOpacity>
                    )}
                    
                    {isRecording === 'audio' ? (
                      <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={stopAudioRecording}>
                        <Text style={styles.controlIcon}>⏹️</Text>
                        <Text style={styles.controlText}>Stop Audio</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.controlBtn, styles.audioBtn]} onPress={startAudioRecording}>
                        <Text style={styles.controlIcon}>🎙️</Text>
                        <Text style={styles.controlText}>Record Audio</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity style={[styles.controlBtn, styles.aiBtn]} onPress={generateAIPhoto}>
                      <Text style={styles.controlIcon}>🤖</Text>
                      <Text style={styles.controlText}>AI Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#007aff" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}

            {/* Recent Photos */}
            {capturedPhotos.length > 0 && (
              <View style={styles.recentSection}>
                <Text style={styles.recentTitle}>Recent Photos ({capturedPhotos.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {capturedPhotos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoThumbnail}
                      onPress={() => {
                        setSelectedImage(photo);
                        setShowImageModal(true);
                      }}
                      onLongPress={() => deletePhoto(index)}
                    >
                      <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                      <TouchableOpacity 
                        style={styles.thumbnailDelete}
                        onPress={() => deletePhoto(index)}
                      >
                        <Text style={styles.thumbnailDeleteText}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
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
            
            {selectedImage && (
              <>
                <Image source={{ uri: selectedImage }} style={styles.modalImage} />
                {connectedDevice && !heyCyanConnected && (
                  <TouchableOpacity 
                    style={styles.modalSendBtn}
                    onPress={() => sendPhotoToDevice(selectedImage)}
                  >
                    <Text style={styles.modalSendText}>Send to Device</Text>
                  </TouchableOpacity>
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
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraBtn: {
    backgroundColor: '#007aff',
  },
  galleryBtn: {
    backgroundColor: '#34c759',
  },
  photoActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  advancedControls: {
    marginTop: 8,
    marginBottom: 16,
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  controlsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  controlBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoBtn: {
    backgroundColor: '#ff9500',
  },
  audioBtn: {
    backgroundColor: '#af52de',
  },
  aiBtn: {
    backgroundColor: '#ff3b30',
  },
  stopBtn: {
    backgroundColor: '#ff3b30',
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  processingOverlay: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  processingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#007aff',
  },
  recentSection: {
    marginTop: 16,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoThumbnail: {
    marginRight: 12,
    position: 'relative',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  thumbnailDelete: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  thumbnailDeleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  modalSendBtn: {
    backgroundColor: '#007aff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSendText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BluetoothScanner;