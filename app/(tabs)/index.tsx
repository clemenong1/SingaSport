import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Text,
  Dimensions,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapView as MapViewType } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

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

export default function MapScreen(): React.JSX.Element {
  const mapRef = useRef<MapViewType>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [search, setSearch] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);


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

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setUserLocation({ latitude, longitude });

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      fetchNearbyCourts(latitude, longitude);
    })();
  }, []);

  const fetchNearbyCourts = async (lat: number, lng: number) => {
    try {
      const res = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        {
          params: {
            location: `${lat},${lng}`,
            radius: 3000,
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
      if (axios.isAxiosError(err)) {
    console.error('Axios error:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
      console.error('Body:', err.response.data);
    }
  } else {
    console.error('Unknown error:', err);
  }
    }
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const filteredAndSortedCourts = courts
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (!userLocation) return 0; 
      const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
      const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
      return distA - distB;
    });


  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search basketball courts (optional)"
        value={search}
        onChangeText={setSearch}
      />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
      >
        {courts.map((court) => (
          <Marker
            key={court.place_id}
            coordinate={{
              latitude: court.latitude,
              longitude: court.longitude,
            }}
            title={court.name}
          />
        ))}
      </MapView>

      <View style={styles.locateButtonContainer}>
      <TouchableOpacity
        onPress={() => {
          if (region && mapRef.current) {
            mapRef.current.animateToRegion(region, 1000);
          }
        }}
        style={styles.locateButton}
      >
        <Ionicons name="locate" size={24} color="white" />
      </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAndSortedCourts}
        keyExtractor={(item) => item.place_id}
        style={styles.list}
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
      />

    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  search: {
    position: 'absolute',
    zIndex: 2,
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
    backgroundColor: 'white',
  },
  card: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },locateButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 3,
  },
  locateButton: {
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 30,
    elevation: 4,
  },
});