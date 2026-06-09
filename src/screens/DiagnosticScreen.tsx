import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import HeyCyanManager from '../native/HeyCyanModule';
import { HeyCyanDevice } from '../native/HeyCyanTypes';
import { DiagnosticEvent, sdkLogger } from '../diagnostics/SDKLogger';
import EventViewer from '../components/EventViewer';

const DiagnosticScreen = () => {
  const [events, setEvents] = useState<DiagnosticEvent[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [devices, setDevices] = useState<HeyCyanDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HeyCyanDevice | null>(null);
  const [checks, setChecks] = useState({
    connected: false,
    battery: false,
    version: false,
    media: false,
  });
  const [flow, setFlow] = useState({
    scanning: false,
    connecting: false,
    connected: false,
    batteryReceived: false,
    versionReceived: false,
    mediaReceived: false,
    photoStarted: false,
    photoCompleted: false,
    photoFailed: false,
  });

  const canTakePhoto = useMemo(
    () => checks.connected && checks.battery && checks.version && checks.media,
    [checks]
  );

  useEffect(() => {
    const unsubscribeLogger = sdkLogger.subscribe(setEvents);
    const removeListeners = [
      HeyCyanManager.onBluetoothStateChanged(status => {
        sdkLogger.info('SDK', 'onBluetoothStateChanged', status);
        if (status?.state === 'scan_started') {
          setFlow(previous => ({ ...previous, scanning: true }));
        }
        if (status?.state === 'scan_stopped') {
          setFlow(previous => ({ ...previous, scanning: false }));
        }
      }),
      HeyCyanManager.onScanResult(device => {
        sdkLogger.info('SDK', '[SDK] Device Found', device);
        setDevices(previous => {
          const exists = previous.some(item => item.id === device.id);
          return exists ? previous.map(item => item.id === device.id ? device : item) : [...previous, device];
        });
        setSelectedDevice(previous => previous ?? device);
      }),
      HeyCyanManager.onConnecting(device => {
        sdkLogger.info('SDK', '[SDK] Connecting', device);
        setFlow(previous => ({ ...previous, connecting: true }));
      }),
      HeyCyanManager.onConnected(device => {
        sdkLogger.info('SDK', '[SDK] Connected', device);
        setChecks(previous => ({ ...previous, connected: true }));
        setFlow(previous => ({ ...previous, connecting: false, connected: true }));
      }),
      HeyCyanManager.onDisconnected(event => {
        sdkLogger.warn('SDK', '[SDK] Disconnected', event);
        setChecks({ connected: false, battery: false, version: false, media: false });
        setFlow(previous => ({ ...previous, connecting: false, connected: false }));
      }),
      HeyCyanManager.onBatteryUpdate(status => {
        sdkLogger.info('SDK', '[SDK] Battery Received', status);
        setChecks(previous => ({ ...previous, battery: true }));
        setFlow(previous => ({ ...previous, batteryReceived: true }));
      }),
      HeyCyanManager.onMediaUpdate(counts => {
        sdkLogger.info('SDK', '[SDK] Media Count Received', counts);
        setChecks(previous => ({ ...previous, media: true }));
        setFlow(previous => ({ ...previous, mediaReceived: true }));
      }),
      HeyCyanManager.onPhotoStarted(event => {
        sdkLogger.info('SDK', '[SDK] Photo Started', event);
        setFlow(previous => ({ ...previous, photoStarted: true, photoCompleted: false, photoFailed: false }));
      }),
      HeyCyanManager.onPhotoCompleted(event => {
        sdkLogger.info('SDK', '[SDK] Photo Success', event);
        setFlow(previous => ({ ...previous, photoCompleted: true, photoFailed: false }));
      }),
      HeyCyanManager.onPhotoFailed(event => {
        sdkLogger.error('SDK', '[SDK] Photo Failed', event);
        setFlow(previous => ({ ...previous, photoFailed: true }));
      }),
      HeyCyanManager.onSdkLog(event => {
        sdkLogger.info('NATIVE', event.message, event);
      }),
      HeyCyanManager.onSdkError(event => {
        sdkLogger.error('SDK', '[SDK] Error', event);
      }),
      HeyCyanManager.onError(error => {
        sdkLogger.error('SDK', 'onError', { error });
      }),
    ];

    sdkLogger.info('APP', 'SDK-only diagnostic screen mounted');

    return () => {
      unsubscribeLogger();
      removeListeners.forEach(remove => remove());
    };
  }, []);

  const runAction = async (label: string, action: () => Promise<void>) => {
    setBusyAction(label);
    sdkLogger.info('APP', `${label} started`);
    try {
      await action();
      sdkLogger.info('APP', `${label} finished`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sdkLogger.error('APP', `${label} failed`, { message });
      Alert.alert(label, message);
    } finally {
      setBusyAction(null);
    }
  };

  const scan = () => runAction('Scan', async () => {
    setDevices([]);
    setSelectedDevice(null);
    setChecks({ connected: false, battery: false, version: false, media: false });
    setFlow({
      scanning: true,
      connecting: false,
      connected: false,
      batteryReceived: false,
      versionReceived: false,
      mediaReceived: false,
      photoStarted: false,
      photoCompleted: false,
      photoFailed: false,
    });

    const initialized = await HeyCyanManager.initialize();
    sdkLogger.info('SDK', '[SDK] Initialized', { initialized });
    const started = await HeyCyanManager.startScan();
    sdkLogger.info('SDK', '[SDK] Scan Started', { started });
  });

  const connect = () => runAction('Connect', async () => {
    if (!selectedDevice) {
      throw new Error('Scan and select a device first');
    }
    await HeyCyanManager.stopScan();
    const connected = await HeyCyanManager.connect(selectedDevice.id);
    sdkLogger.info('SDK', '[SDK] Connected result', { connected, deviceId: selectedDevice.id });
    setChecks(previous => ({ ...previous, connected }));
    setFlow(previous => ({ ...previous, connected, connecting: false, scanning: false }));
  });

  const battery = () => runAction('Battery', async () => {
    const result = await HeyCyanManager.getBattery();
    sdkLogger.info('SDK', '[SDK] Battery immediate result', result);
    setChecks(previous => ({ ...previous, battery: true }));
    setFlow(previous => ({ ...previous, batteryReceived: true }));
  });

  const version = () => runAction('Version', async () => {
    const result = await HeyCyanManager.getVersion();
    sdkLogger.info('SDK', '[SDK] Version Received', result);
    setChecks(previous => ({ ...previous, version: true }));
    setFlow(previous => ({ ...previous, versionReceived: true }));
  });

  const mediaCount = () => runAction('Media Count', async () => {
    const result = await HeyCyanManager.getMediaCount();
    sdkLogger.info('SDK', '[SDK] Media Count immediate result', result);
    setChecks(previous => ({ ...previous, media: true }));
    setFlow(previous => ({ ...previous, mediaReceived: true }));
  });

  const takePhoto = () => runAction('Take Photo', async () => {
    if (!canTakePhoto) {
      throw new Error('Connect, Battery, Version, and Media Count must all pass before Take Photo');
    }

    sdkLogger.info('SDK', '[SDK] Take Photo Requested');
    const result = await HeyCyanManager.takePhoto();
    sdkLogger.info('SDK', '[SDK] takePhoto() returned', { result });
  });

  const showLogs = () => {
    sdkLogger.info('APP', 'Show Logs pressed', { count: events.length, newest: events[0] });
  };

  const flowItems = [
    ['SDK Scan', flow.scanning],
    ['Device List', devices.length > 0],
    ['SDK Connect', flow.connecting || flow.connected],
    ['Connected State', checks.connected],
    ['Battery', checks.battery],
    ['Version', checks.version],
    ['Media Count', checks.media],
    ['Photo Started', flow.photoStarted],
    ['Photo Completed', flow.photoCompleted],
    ['Photo Failed', flow.photoFailed],
  ] as const;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>HeyCyan SDK-Only Diagnostics</Text>
        <Text style={styles.subtitle}>No react-native-ble-plx scan/connect is used on this screen.</Text>

        <View style={styles.flow}>
          {flowItems.map(([label, active]) => (
            <View key={label} style={[styles.flowItem, active && styles.flowItemActive]}>
              <Text style={[styles.flowText, active && styles.flowTextActive]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonGrid}>
          <DiagButton label="Scan" busy={busyAction === 'Scan'} onPress={scan} />
          <DiagButton label="Connect" busy={busyAction === 'Connect'} onPress={connect} disabled={!selectedDevice} />
          <DiagButton label="Battery" busy={busyAction === 'Battery'} onPress={battery} disabled={!checks.connected} />
          <DiagButton label="Version" busy={busyAction === 'Version'} onPress={version} disabled={!checks.connected} />
          <DiagButton label="Media Count" busy={busyAction === 'Media Count'} onPress={mediaCount} disabled={!checks.connected} />
          <DiagButton label="Take Photo" busy={busyAction === 'Take Photo'} onPress={takePhoto} disabled={!canTakePhoto} />
          <DiagButton label="Show Logs" onPress={showLogs} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SDK Device List</Text>
          {devices.map(device => (
            <TouchableOpacity
              key={device.id}
              style={[styles.deviceRow, selectedDevice?.id === device.id && styles.deviceRowActive]}
              onPress={() => setSelectedDevice(device)}
            >
              <Text style={styles.deviceName}>{device.name || 'Unknown SDK Device'}</Text>
              <Text style={styles.deviceMeta}>{device.id} RSSI {device.rssi ?? 'n/a'}</Text>
            </TouchableOpacity>
          ))}
          {devices.length === 0 && <Text style={styles.emptyText}>Press Scan to populate SDK scan results.</Text>}
        </View>

        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Last {events.length} Events</Text>
          <TouchableOpacity style={styles.clearButton} onPress={() => sdkLogger.clear()}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
        <EventViewer events={events} />
      </ScrollView>
    </SafeAreaView>
  );
};

interface DiagButtonProps {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const DiagButton = ({ label, busy, disabled, onPress }: DiagButtonProps) => (
  <TouchableOpacity style={[styles.button, disabled && styles.buttonDisabled]} onPress={onPress} disabled={busy || disabled}>
    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  container: {
    padding: 12,
    gap: 12,
  },
  title: {
    color: '#102a43',
    fontSize: 23,
    fontWeight: '700',
  },
  subtitle: {
    color: '#52606d',
    fontSize: 13,
  },
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flowItem: {
    borderColor: '#bcccdc',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  flowItemActive: {
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  flowText: {
    color: '#334e68',
    fontSize: 12,
    fontWeight: '600',
  },
  flowTextActive: {
    color: '#fff',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0b6bcb',
    borderRadius: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '48%',
  },
  buttonDisabled: {
    backgroundColor: '#9fb3c8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  sectionTitle: {
    color: '#102a43',
    fontSize: 16,
    fontWeight: '700',
  },
  deviceRow: {
    borderColor: '#d9e2ec',
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
  },
  deviceRowActive: {
    borderColor: '#0b6bcb',
    borderWidth: 2,
  },
  deviceName: {
    color: '#102a43',
    fontSize: 14,
    fontWeight: '700',
  },
  deviceMeta: {
    color: '#52606d',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: '#7b8794',
    fontSize: 13,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButton: {
    backgroundColor: '#d64545',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default DiagnosticScreen;
