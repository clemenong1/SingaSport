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
import axios from 'axios';
import * as Location from 'expo-location';

const GOOGLE_API_KEY = 'AIzaSyB01KvNeXC7aRXmCAA3z6aKO4keIG7U244';

interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean;
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
    if (userLocation) {
      fetchNearbyCourts(userLocation.latitude, userLocation.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

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
        setError('Location permission denied. Please enable location to search for courts.');
      }
    } catch (error) {
      setError('Error getting location.');
      console.error('Error getting location:', error);
    }
  };

  const fetchNearbyCourts = async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${lat},${lng}`,
            radius: 5000, // 10km radius
            keyword: 'basketball court',
            key: GOOGLE_API_KEY,
          },
        }
      );

      const results = res.data.results.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.vicinity,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        isOpen: place.opening_hours?.open_now,
      }));

      setCourts(results);
    } catch (err) {
      setError('Error fetching courts.');
      console.error('Error fetching courts:', err);
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

  const handleSearch = () => {
    if (userLocation) {
      fetchNearbyCourts(userLocation.latitude, userLocation.longitude);
    } else {
      setError('Location not available.');
    }
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
          <Text style={styles.loadingText}>Searching for courts...</Text>
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
                {search ? 'No courts found matching your search' : 'Search for basketball courts'}
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
});