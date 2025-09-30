import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TripCard({ trip, onPress }) {
  const startTime = new Date(trip.start_time);
  const endTime = trip.end_time ? new Date(trip.end_time) : null;
  const duration = endTime 
    ? Math.round((endTime - startTime) / 60000) 
    : null;

  const getModeIcon = (mode) => {
    const icons = {
      car: '🚗',
      bike: '🚴',
      walk: '🚶',
      metro: '🚇',
      train: '🚂'
    };
    return icons[mode] || '🚗';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#4CAF50' : '#007AFF';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.tripId}>Trip #{trip.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.modeText}>
          {getModeIcon(trip.mode)} {trip.mode.charAt(0).toUpperCase() + trip.mode.slice(1)}
        </Text>
        <Text style={styles.dateText}>
          📅 {startTime.toLocaleDateString()} at {startTime.toLocaleTimeString()}
        </Text>
        {duration && (
          <Text style={styles.durationText}>
            ⏱️ Duration: {duration} minutes
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tripId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    gap: 5,
  },
  modeText: {
    fontSize: 15,
    color: '#666',
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
