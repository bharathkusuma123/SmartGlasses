import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import DiagnosticScreen from './src/screens/DiagnosticScreen';

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <DiagnosticScreen />
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
