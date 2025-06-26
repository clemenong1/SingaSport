import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../src/services/FirebaseConfig';

interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean;
  peopleNumber?: number;
  geohash?: string;
}

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [courts, setCourts] = useState<Court[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Fetch all courts from Firebase when component mounts
    fetchCourtsFromFirebase();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setError('Location permission denied. Please enable location to see distances.');
      }
    } catch (error) {
      setError('Error getting location.');
      console.error('Error getting location:', error);
    }
  };

  const fetchCourtsFromFirebase = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching courts from Firebase...');
      const courtsCollection = collection(db, 'basketballCourts');
      const courtSnapshot = await getDocs(courtsCollection);
      
      const courtsList = courtSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Court data:', data);
        
        // Handle different possible location formats
        let latitude = 0;
        let longitude = 0;
        
        if (data.location) {
          if (data.location.latitude && data.location.longitude) {
            latitude = data.location.latitude;
            longitude = data.location.longitude;
          } else if (data.location._lat && data.location._long) {
            latitude = data.location._lat;
            longitude = data.location._long;
          }
        }
        
        return {
          place_id: doc.id,
          name: data.name || 'Unknown Court',
          latitude: latitude,
          longitude: longitude,
          address: data.address || 'Address not available',
          rating: data.rating,
          userRatingsTotal: data.userRatingsTotal,
          isOpen: data.isOpen,
          peopleNumber: data.peopleNumber || 0,
          geohash: data.geohash,
        };
      });

      setCourts(courtsList);
    } catch (err) {
      setError('Error fetching courts from database.');
      console.error('Error fetching courts from Firebase:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter courts with prefix matching
  const filteredCourts = courts
    .filter((court) => {
      const searchLower = search.toLowerCase();
      const nameLower = court.name.toLowerCase();
      // Check if the name starts with the search term (prefix matching)
      return nameLower.startsWith(searchLower);
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
      const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
      return distA - distB;
    });

  const handleRefresh = () => {
    fetchCourtsFromFirebase();
  };

  const handleMapButton = () => {
    router.back(); // Navigate back to the map screen
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMapButton} style={styles.mapButton}>
          <Ionicons name="map" size={24} color="#007BFF" />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Search Courts</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search basketball courts..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>Loading courts from database...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCourts}
          keyExtractor={(item) => item.place_id}
          style={styles.list}
          onScrollBeginDrag={Keyboard.dismiss}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.name}</Text>
              {item.address && <Text style={styles.address}>{item.address}</Text>}
              {item.rating && (
                <Text style={styles.rating}>
                  ⭐ {item.rating} ({item.userRatingsTotal ?? 0} reviews)
                </Text>
              )}
              {item.isOpen !== undefined && (
                <Text style={styles.openStatus}>
                  {item.isOpen ? '🟢 Open now' : '🔴 Closed'}
                </Text>
              )}
              {item.peopleNumber !== undefined && (
                <Text style={styles.peopleCount}>
                  👥 {item.peopleNumber} people currently
                </Text>
              )}
              {userLocation && (
                <Text style={styles.distance}>
                  📍 {calculateDistanceKm(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude).toFixed(2)} km away
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search ? 'No courts found matching your search' : 'No courts available in database'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  mapButtonText: {
    marginLeft: 4,
    color: '#007BFF',
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    fontSize: 16,
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  openStatus: {
    fontSize: 14,
    marginBottom: 2,
  },
  distance: {
    fontSize: 14,
    color: '#007BFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffe6e6',
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 20,
  },
  peopleCount: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    marginBottom: 2,
  },
});