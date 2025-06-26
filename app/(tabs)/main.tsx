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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import type { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import * as geolib from 'geolib';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../src/services/FirebaseConfig';


// Add your geofence data
const basketballCourts = [
  { id: 'VP Sheltered Basketball Court', latitude: 1.4296513, longitude: 103.7974786, radius: 100 },
  { id: 'court2', latitude: 1.305, longitude: 103.805, radius: 100 },
  { id: 'clemen house', latitude: 1.4284690, longitude: 103.7926025, radius: 1000 },
];

const insideStates: Record<string, boolean> = {};

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

export default function MapScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [search, setSearch] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

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
      // Request notification permissions
      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required.');
        return;
      }

      // Get initial location
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

      // Start foreground location tracking
      const locationSubscription = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          // Update user location state
          setUserLocation({ latitude, longitude });
          
          // Check geofences
          for (const court of basketballCourts) {
            const isInside = geolib.isPointWithinRadius(
              { latitude, longitude },
              { latitude: court.latitude, longitude: court.longitude },
              court.radius
            );

            if (isInside && !insideStates[court.id]) {
              insideStates[court.id] = true;
              console.log(`Entered geofence: ${court.id}`);

              // Show notification
              Notifications.scheduleNotificationAsync({
                content: {
                  title: `Entered ${court.id}`,
                  body: `You are inside the geofence for ${court.id}`,
                },
                trigger: null,
              });

            } else if (!isInside && insideStates[court.id]) {
              insideStates[court.id] = false;
              console.log(`Exited geofence: ${court.id}`);

              // Show notification
              Notifications.scheduleNotificationAsync({
                content: {
                  title: `Exited ${court.id}`,
                  body: `You left the geofence for ${court.id}`,
                },
                trigger: null,
              });
            }
          }
        }
      );

      // Cleanup subscription when component unmounts
      return () => {
        locationSubscription.then(sub => sub.remove());
      };
    })();
  }, []);

  const fetchNearbyCourts = async (lat: number, lng: number) => {
    try {
      console.log('Fetching courts from Firebase...');
      const courtsCollection = collection(db, 'basketballCourts');
      const courtSnapshot = await getDocs(courtsCollection);
      
      const courtsList = courtSnapshot.docs.map(doc => {
        const data = doc.data();
        
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

      // Filter courts within a reasonable distance (optional)
      const nearbyCourtsList = courtsList.filter(court => {
        if (court.latitude === 0 && court.longitude === 0) return false;
        const distance = calculateDistanceKm(lat, lng, court.latitude, court.longitude);
        return distance <= 200; // Only show courts within 3km
      });

      setCourts(nearbyCourtsList);
      console.log(`Loaded ${nearbyCourtsList.length} nearby courts from Firebase`);
    } catch (err) {
      console.error('Error fetching courts from Firebase:', err);
      Alert.alert('Error', 'Failed to load basketball courts from database.');
    }
  };

  // Function to navigate to a specific court on the map
  const navigateToCourtOnMap = (court: Court) => {
    if (mapRef.current) {
      const newRegion = {
        latitude: court.latitude,
        longitude: court.longitude,
        latitudeDelta: 0.005, // Zoom in closer to the court
        longitudeDelta: 0.005,
      };
      
      mapRef.current.animateToRegion(newRegion, 1000);
      
      // Highlight the selected court temporarily
      setSelectedCourtId(court.place_id);
      
      // Clear the selection after 3 seconds
      setTimeout(() => {
        setSelectedCourtId(null);
      }, 3000);
      
      console.log(`Navigating to ${court.name}`);
    }
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Sort courts by distance from user
  const sortedCourts = courts.sort((a, b) => {
    if (!userLocation) return 0; 
    const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
    const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
    return distA - distB;
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.search}
        onPress={() => router.push('/search')}
        activeOpacity={0.7}
      >
        <View style={styles.searchContent}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search basketball courts</Text>
        </View>
      </TouchableOpacity>
      
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
      >
        {sortedCourts.map((court) => (
          <Marker
            key={court.place_id}
            coordinate={{
              latitude: court.latitude,
              longitude: court.longitude,
            }}
            title={court.name}
            description={court.address}
            pinColor={selectedCourtId === court.place_id ? '#FF6B6B' : '#FF0000'}
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
        data={sortedCourts}
        keyExtractor={(item) => item.place_id}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigateToCourtOnMap(item)}
            activeOpacity={0.7}
          >
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
            
            {/* Add a visual indicator that the item is tappable */}
            <View style={styles.navigationHint}>
              <Ionicons name="chevron-forward" size={16} color="#007BFF" />
              <Text style={styles.navigationText}>Tap to view on map</Text>
            </View>
          </TouchableOpacity>
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    color: '#666',
    fontSize: 16,
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
    backgroundColor: '#f5f5f5',
    paddingTop: 8,
  },
  card: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  openStatus: {
    fontSize: 14,
    marginTop: 2,
  },
  peopleCount: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    marginTop: 2,
  },
  distance: {
    fontSize: 14,
    color: '#007BFF',
    marginTop: 2,
  },
  locateButtonContainer: {
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
  navigationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  navigationText: {
    fontSize: 14,
    color: '#007BFF',
    marginLeft: 4,
  },
});