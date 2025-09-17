import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';

const BASE_URL = 'http://10.0.2.2:8000';

export default function TripScreen({ route, navigation }) {
  const { userId, userName } = route.params;
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
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/trip/user/${userId}`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const checkActiveTrip = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/trip/active/${userId}`);
      setActiveTrip(response.data);
    } catch (error) {
      setActiveTrip(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTrips(), checkActiveTrip()]);
    setRefreshing(false);
  };

  const startTrip = async () => {
    setLoading(true);
    try {
      const location = currentLocation || { lat: 20.2961, lng: 85.8245 };
      
      const response = await axios.post(
        `${BASE_URL}/trip/start?user_id=${userId}`,
        {
          mode: selectedMode,
          start_lat: location.lat,
          start_lng: location.lng,
        }
      );
      
      setActiveTrip(response.data);
      setModalVisible(false);
      Alert.alert('Success', 'Trip started successfully');
      fetchTrips();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  const stopTrip = async () => {
    if (!activeTrip) {
      return;
    }
    
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
              const location = currentLocation || { lat: 20.2961, lng: 85.8245 };
              
              const response = await axios.post(
                `${BASE_URL}/trip/stop/${activeTrip.id}`,
                {
                  end_lat: location.lat,
                  end_lng: location.lng,
                }
              );
              
              Alert.alert('Success', `Trip ended. Duration: ${response.data.duration_minutes} minutes`);
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

  const renderTripItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tripItem}
      onPress={() => {
        if (item.status === 'completed') {
          navigation.navigate('Map', { 
            tripId: item.id,
            tripData: item 
          });
        }
      }}
    >
      <View style={styles.tripHeader}>
        <Text style={styles.tripId}>Trip #{item.id}</Text>
        <Text style={[
          styles.tripStatus,
          item.status === 'active' ? styles.activeStatus : styles.completedStatus
        ]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.tripMode}>Mode: {item.mode}</Text>
      <Text style={styles.tripDate}>
        {new Date(item.start_time).toLocaleDateString()} at {new Date(item.start_time).toLocaleTimeString()}
      </Text>
      {item.end_time && (
        <Text style={styles.tripDuration}>
          Duration: {Math.round((new Date(item.end_time) - new Date(item.start_time)) / 60000)} minutes
        </Text>
      )}
    </TouchableOpacity>
  );

  const logout = async () => {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome, {userName}!</Text>
          <Text style={styles.locationText}>
            📍 {currentLocation ? 'Location Available' : 'Location Not Available'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      {activeTrip ? (
        <View style={styles.activeTrip}>
          <Text style={styles.activeText}>Active Trip</Text>
          <Text style={styles.tripDetail}>Mode: {activeTrip.mode}</Text>
          <Text style={styles.tripDetail}>
            Started: {new Date(activeTrip.start_time).toLocaleTimeString()}
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]}
              onPress={stopTrip}
              disabled={loading}
            >
              <Text style={styles.buttonText}>End Trip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.mapButton]}
              onPress={() => navigation.navigate('Map', { 
                tripId: activeTrip.id,
                isActive: true 
              })}
            >
              <Text style={styles.buttonText}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => setModalVisible(true)}
          disabled={loading}
        >
          <Text style={styles.startButtonText}>Start New Trip</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Trip History</Text>
      
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTripItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No trips yet. Start your first trip!</Text>
        }
        contentContainerStyle={trips.length === 0 ? styles.emptyList : null}
      />

      {/* Start Trip Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start New Trip</Text>
            
            <Text style={styles.modalLabel}>Select Transport Mode:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMode}
                onValueChange={setSelectedMode}
                style={styles.picker}
              >
                <Picker.Item label="🚗 Car" value="car" />
                <Picker.Item label="🏍️ Bike" value="bike" />
                <Picker.Item label="🚂 Train" value="train" />
                <Picker.Item label="🚇 Metro" value="metro" />
                <Picker.Item label="🚶 Walk" value="walk" />
              </Picker>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={startTrip}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    Start Trip
                  </Text>
                )}
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
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  activeTrip: {
    backgroundColor: '#e7f3ff',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  activeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  tripDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
  },
  mapButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#34c759',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  tripItem: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeStatus: {
    backgroundColor: '#34c759',
    color: 'white',
  },
  completedStatus: {
    backgroundColor: '#8e8e93',
    color: 'white',
  },
  tripMode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tripDate: {
    fontSize: 12,
    color: '#999',
  },
  tripDuration: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
