import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

const BASE_URL = 'http://10.0.2.2:8000'; // For Android Emulator
// const BASE_URL = 'http://YOUR_SERVER_IP:8000'; // For physical device

const TRANSPORT_MODES = ['car', 'bike', 'walk', 'metro', 'train'];

export default function TripScreen({ route, navigation }) {
  const { userId, userName, userEmail } = route.params;
  const [trips, setTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMode, setSelectedMode] = useState('car');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    fetchTrips();
    checkActiveTrip();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for trip tracking');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.error('Location error:', error);
      // Set default location (Kolkata)
      setCurrentLocation({
        latitude: 22.5726,
        longitude: 88.3639
      });
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/trip/user/${userId}`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      Alert.alert('Error', 'Failed to fetch trips');
    }
  };

  const checkActiveTrip = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/trip/active/${userId}`);
      setActiveTrip(response.data);
    } catch (error) {
      // No active trip - this is normal
      setActiveTrip(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchTrips(), checkActiveTrip()])
      .finally(() => setRefreshing(false));
  }, []);

  const startTrip = async () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    setLoading(true);
    setModalVisible(false);

    try {
      const response = await axios.post(
        `${BASE_URL}/trip/start?user_id=${userId}`,
        {
          mode: selectedMode,
          start_lat: currentLocation.latitude,
          start_lng: currentLocation.longitude,
        }
      );
      
      setActiveTrip(response.data);
      Alert.alert('Success', 'Trip started successfully!');
      fetchTrips();
    } catch (error) {
      console.error('Start trip error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const stopTrip = async () => {
    if (!activeTrip || !currentLocation) return;
    
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await axios.post(
                `${BASE_URL}/trip/stop/${activeTrip.id}`,
                {
                  end_lat: currentLocation.latitude,
                  end_lng: currentLocation.longitude,
                }
              );
              
              Alert.alert('Success', `Trip ended! Duration: ${response.data.duration_minutes} minutes`);
              setActiveTrip(null);
              fetchTrips();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to stop trip');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const renderTripItem = ({ item }) => {
    const startTime = new Date(item.start_time);
    const endTime = item.end_time ? new Date(item.end_time) : null;
    const duration = endTime 
      ? Math.round((endTime - startTime) / 60000) 
      : null;

    return (
      <TouchableOpacity 
        style={styles.tripItem}
        onPress={() => {
          if (item.status === 'completed') {
            navigation.navigate('Map', { 
              tripId: item.id,
              userId: userId 
            });
          }
        }}
      >
        <View style={styles.tripHeader}>
          <Text style={styles.tripId}>Trip #{item.id}</Text>
          <View style={[styles.statusBadge, 
            item.status === 'active' ? styles.activeBadge : styles.completedBadge
          ]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.tripMode}>🚗 Mode: {item.mode}</Text>
        <Text style={styles.tripDate}>📅 {startTime.toLocaleDateString()}</Text>
        <Text style={styles.tripTime}>⏰ {startTime.toLocaleTimeString()}</Text>
        {duration && (
          <Text style={styles.tripDuration}>⏱️ Duration: {duration} minutes</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {userName}!</Text>
          <Text style={styles.email}>{userEmail}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {activeTrip ? (
        <View style={styles.activeTrip}>
          <Text style={styles.activeTitle}>🔴 Active Trip</Text>
          <Text style={styles.activeInfo}>Mode: {activeTrip.mode}</Text>
          <Text style={styles.activeInfo}>
            Started: {new Date(activeTrip.start_time).toLocaleTimeString()}
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]}
              onPress={stopTrip}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>End Trip</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.mapButton]}
              onPress={() => navigation.navigate('Map', { 
                tripId: activeTrip.id,
                userId: userId,
                isActive: true 
              })}
            >
              <Text style={styles.buttonText}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.startButton]}
          onPress={() => setModalVisible(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start New Trip</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Trip History</Text>
      
      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No trips yet</Text>
          <Text style={styles.emptySubtext}>Start your first trip to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTripItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Transport Mode Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Transport Mode</Text>
            {TRANSPORT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeOption,
                  selectedMode === mode && styles.selectedMode
                ]}
                onPress={() => setSelectedMode(mode)}
              >
                <Text style={[
                  styles.modeText,
                  selectedMode === mode && styles.selectedModeText
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.confirmButton]}
                onPress={startTrip}
              >
                <Text style={styles.buttonText}>Start Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  welcome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  activeTrip: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    margin: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 10,
  },
  activeInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  mapButton: {
    backgroundColor: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  listContainer: {
    paddingBottom: 20,
  },
  tripItem: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
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
  activeBadge: {
    backgroundColor: '#4CAF50',
  },
  completedBadge: {
    backgroundColor: '#007AFF',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tripMode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  tripDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  tripTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  tripDuration: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modeOption: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedMode: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  modeText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  selectedModeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
