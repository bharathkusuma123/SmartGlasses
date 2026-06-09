import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DiagnosticEvent } from '../diagnostics/SDKLogger';

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

const formatData = (data: unknown) => {
  if (data === undefined || data === null) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};

interface EventViewerProps {
  events: DiagnosticEvent[];
}

const EventViewer = ({ events }: EventViewerProps) => (
  <ScrollView style={styles.container}>
    {events.map(event => (
      <View key={event.id} style={styles.eventRow}>
        <Text style={styles.meta}>
          {formatTime(event.timestamp)} [{event.source}] {event.level.toUpperCase()}
        </Text>
        <Text style={styles.message}>{event.message}</Text>
        {!!formatData(event.data) && <Text style={styles.data}>{formatData(event.data)}</Text>}
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111',
    borderRadius: 6,
    maxHeight: 360,
    padding: 8,
  },
  eventRow: {
    borderBottomColor: '#333',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  meta: {
    color: '#8ab4f8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  message: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
  },
  data: {
    color: '#bbb',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});

export default EventViewer;
