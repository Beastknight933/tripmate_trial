import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import * as Location from 'expo-location';

const BASE_URL = 'http://10.0.2.2:8000'; // For Android Emulator
// const BASE_URL = 'http://YOUR_SERVER_IP:8000'; // For physical device

export default function MapScreen({ route, navigation }) {
  const { tripId, userId, isActive } = route.params;
  const [region, setRegion] = useState({
    latitude: 22.5726,
    longitude: 88.3639,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [destinations, setDestinations] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    getCurrentLocation();
    if (tripId) {
      fetchDestinations();
    }
  }, [tripId]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      setRegion(newRegion);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const fetchDestinations = async () => {
    if (!tripId) return;
    
    try {
      const response = await axios.get(`${BASE_URL}/destinations/${tripId}/list`);
      setDestinations(response.data);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    }
  };

  const searchPlaces = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/map/search`, {
        params: { query: searchQuery }
      });
      
      // Handle MapMyIndia response format
      if (response.data && response.data.suggestedLocations) {
        setSearchResults(response.data.suggestedLocations);
      } else if (response.data && response.data.results) {
        setSearchResults(response.data.results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search places');
    } finally {
      setLoading(false);
    }
  };

  const addDestination = async (place) => {
    if (!tripId || !place) return;
    
    setLoading(true);
    try {
      const lat = parseFloat(place.latitude || place.lat);
      const lng = parseFloat(place.longitude || place.lng || place.lon);
      const name = place.placeName || place.name || searchQuery;
      
      const response = await axios.post(`${BASE_URL}/destinations/${tripId}/add`, {
        name: name,
        lat: lat,
        lng: lng
      });
      
      Alert.alert('Success', 'Destination added!');
      fetchDestinations();
      setModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Move map to new destination
      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Add destination error:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add destination');
    } finally {
      setLoading(false);
    }
  };

  const deleteDestination = (destinationId) => {
    Alert.alert(
      'Delete Destination',
      'Are you sure you want to remove this destination?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BASE_URL}/destinations/${destinationId}`);
              Alert.alert('Success', 'Destination removed');
              fetchDestinations();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove destination');
            }
          }
        }
      ]
    );
  };

  const findNearbyPlaces = async (type = 'fuel') => {
    if (!currentLocation) {
      Alert.alert('Error', 'Current location not available');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/map/nearby`, {
        params: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          type: type
        }
      });
      
      if (response.data && response.data.suggestedLocations) {
        setNearbyPlaces(response.data.suggestedLocations);
      } else if (response.data && response.data.results) {
        setNearbyPlaces(response.data.results);
      }
    } catch (error) {
      console.error('Nearby places error:', error);
      Alert.alert('Error', 'Failed to fetch nearby places');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
          />
        )}
        
        {destinations.map((dest, index) => (
          <Marker
            key={dest.id}
            coordinate={{
              latitude: dest.lat,
              longitude: dest.lng
            }}
            title={dest.name}
            description={`Stop ${index + 1}`}
            pinColor="red"
            onPress={() => {
              if (isActive) {
                Alert.alert(
                  dest.name,
                  `Stop ${index + 1}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => deleteDestination(dest.id) }
                  ]
                );
              }
            }}
          />
        ))}
        
        {nearbyPlaces.map((place) => (
          <Marker
            key={place.placeId || place.id}
            coordinate={{
              latitude: parseFloat(place.latitude || place.lat),
              longitude: parseFloat(place.longitude || place.lng || place.lon)
            }}
            title={place.placeName || place.name}
            pinColor="green"
          />
        ))}
        
        {destinations.length > 1 && (
          <Polyline
            coordinates={destinations.map(d => ({
              latitude: d.lat,
              longitude: d.lng
            }))}
            strokeColor="#007AFF"
            strokeWidth={3}
          />
        )}
      </MapView>

      <View style={styles.controls}>
        {isActive && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.actionButtonText}>+ Add Destination</Text>
            </TouchableOpacity>

            <View style={styles.nearbyButtons}>
              <TouchableOpacity
                style={styles.nearbyButton}
                onPress={() => findNearbyPlaces('fuel')}
              >
                <Text style={styles.nearbyButtonText}>⛽ Fuel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.nearbyButton}
                onPress={() => findNearbyPlaces('food')}
              >
                <Text style={styles.nearbyButtonText}>🍔 Food</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.nearbyButton}
                onPress={() => findNearbyPlaces('atm')}
              >
                <Text style={styles.nearbyButtonText}>💰 ATM</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        
        {destinations.length > 0 && (
          <View style={styles.destinationList}>
            <Text style={styles.listTitle}>Destinations ({destinations.length})</Text>
            {destinations.slice(0, 3).map((dest, index) => (
              <View key={dest.id} style={styles.destinationItem}>
                <Text style={styles.destinationText}>
                  {index + 1}. {dest.name}
                </Text>
              </View>
            ))}
            {destinations.length > 3 && (
              <Text style={styles.moreText}>+{destinations.length - 3} more</Text>
            )}
          </View>
        )}
      </View>

      {/* Search Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Destination</Text>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a place..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchPlaces}
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchPlaces}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => (item.placeId || item.id || index.toString())}
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => addDestination(item)}
                >
                  <Text style={styles.resultTitle}>
                    {item.placeName || item.name || item.display_name}
                  </Text>
                  <Text style={styles.resultAddress}>
                    {item.placeAddress || item.address || item.formatted_address || ''}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                searchQuery && !loading ? (
                  <Text style={styles.noResults}>No results found</Text>
                ) : null
              )}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nearbyButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  nearbyButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  nearbyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  destinationList: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  destinationItem: {
    paddingVertical: 5,
  },
  destinationText: {
    fontSize: 14,
    color: '#333',
  },
  moreText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsList: {
    flex: 1,
    marginBottom: 10,
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#999',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

                  `Stop ${index + 1}`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => deleteDestination(dest.id) }
                  ]
                );
              }
            }}
