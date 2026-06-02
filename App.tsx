import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import BluetoothScanner from './src/components/BluetoothScanner';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <BluetoothScanner />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;