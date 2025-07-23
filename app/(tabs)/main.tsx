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
import { collection, getDocs, query, where, orderBy, limit, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../../src/services/FirebaseConfig';
import { isCourtCurrentlyOpen } from '../../src/utils';
import geohash from 'ngeohash';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  isOpen?: boolean | null;
  peopleNumber?: number;
  geohash?: string;
  openingHours?: string[] | null;
}

interface BasketballCourt {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  docId?: string; // Optional Firestore document ID for efficient updates
}

export default function MapScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [search, setSearch] = useState<string>('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [nearbyCourts, setNearbyCourts] = useState<BasketballCourt[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [insideStates, setInsideStates] = useState<Record<string, boolean>>({});
  const [statesLoaded, setStatesLoaded] = useState<boolean>(false);

  const loadGeofenceStates = async () => {
    try {
      const savedStates = await AsyncStorage.getItem('geofenceStates');
      if (savedStates) {
        const parsedStates = JSON.parse(savedStates);
        setInsideStates(parsedStates);} else {}
    } catch (error) {
      console.error('Error loading geofence states:', error);
    } finally {
      setStatesLoaded(true);
    }
  };

  const saveGeofenceStates = async (newStates: Record<string, boolean>) => {
    try {
      await AsyncStorage.setItem('geofenceStates', JSON.stringify(newStates));} catch (error) {
      console.error('Error saving geofence states:', error);
    }
  };

  useEffect(() => {
    loadGeofenceStates();
  }, []);

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

  /**
   * Find the correct Firestore document ID for a court based on its name
   * Since court.id comes from the name field, we need to find the actual doc ID
   */
  const findCourtDocumentId = async (courtName: string): Promise<string | null> => {
    try {
      const courtsRef = collection(db, 'basketballCourts');
      const courtsQuery = query(courtsRef, where('name', '==', courtName), limit(1));
      const snapshot = await getDocs(courtsQuery);

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;return docId;
      } else {
        console.error(`No document found for court: ${courtName}`);
        return null;
      }
    } catch (error) {
      console.error('Error finding court document ID:', error);
      return null;
    }
  };

  /**
   * Decrement people count when user exits geofence (with minimum of 0)
   */
  const decrementPeopleCount = async (courtName: string): Promise<boolean> => {
    try {
      const courtDocId = await findCourtDocumentId(courtName);
      if (!courtDocId) {
        console.error(`Cannot decrement: Court document ID not found for ${courtName}`);
        return false;
      }

      const courtRef = doc(db, 'basketballCourts', courtDocId);

      const courtDoc = await getDoc(courtRef);
      if (courtDoc.exists()) {
        const currentCount = courtDoc.data().peopleNumber || 0;

        if (currentCount > 0) {
          await updateDoc(courtRef, {
            peopleNumber: increment(-1)
          });return true;
        } else {return true; // Not an error, just already at minimum
        }
      } else {
        console.error(`Court document not found: ${courtDocId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error decrementing people count for ${courtName}:`, error);
      return false;
    }
  };

  /**
   * Optimized increment using docId when available
   */
  const incrementPeopleCountOptimized = async (courtName: string, docId?: string): Promise<boolean> => {
    try {
      let courtDocId = docId;

      if (!courtDocId) {
        const foundDocId = await findCourtDocumentId(courtName);
        if (!foundDocId) {
          console.error(`Cannot increment: Court document ID not found for ${courtName}`);
          return false;
        }
        courtDocId = foundDocId;
      }

      const courtRef = doc(db, 'basketballCourts', courtDocId);

      await updateDoc(courtRef, {
        peopleNumber: increment(1)
      });return true;
    } catch (error) {
      console.error(`Error incrementing people count for ${courtName}:`, error);
      return false;
    }
  };

  /**
   * Optimized decrement using docId when available
   */
  const decrementPeopleCountOptimized = async (courtName: string, docId?: string): Promise<boolean> => {
    try {
      let courtDocId = docId;

      if (!courtDocId) {
        const foundDocId = await findCourtDocumentId(courtName);
        if (!foundDocId) {
          console.error(`Cannot decrement: Court document ID not found for ${courtName}`);
          return false;
        }
        courtDocId = foundDocId;
      }

      const courtRef = doc(db, 'basketballCourts', courtDocId);

      const courtDoc = await getDoc(courtRef);
      if (courtDoc.exists()) {
        const currentCount = courtDoc.data().peopleNumber || 0;

        if (currentCount > 0) {
          await updateDoc(courtRef, {
            peopleNumber: increment(-1)
          });return true;
        } else {return true; // Not an error, just already at minimum
        }
      } else {
        console.error(`Court document not found: ${courtDocId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error decrementing people count for ${courtName}:`, error);
      return false;
    }
  };

  useEffect(() => {

    if (!statesLoaded) {return;
    }

    (async () => {

      const { status: notificationStatus } = await Notifications.requestPermissionsAsync();

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

      const locationSubscription = Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds for people count tracking

        },
        async (location) => {
          const { latitude, longitude } = location.coords;

          const timestamp = new Date().toLocaleTimeString();setUserLocation({ latitude, longitude });

          try {const currentNearbyCourts = await getNearbyBasketballCourtsFromLocation(latitude, longitude);

            for (const court of currentNearbyCourts) {
              const isInside = geolib.isPointWithinRadius(
                { latitude, longitude },
                { latitude: court.latitude, longitude: court.longitude },
                court.radius
              );

              // Get the current state from AsyncStorage to avoid stale closure
              const savedStates = await AsyncStorage.getItem('geofenceStates');
              const currentStates = savedStates ? JSON.parse(savedStates) : {};
              const wasInside = currentStates[court.id] || false;

              if (isInside && !wasInside) {

                const newStates = { ...currentStates, [court.id]: true };
                setInsideStates(newStates);
                await saveGeofenceStates(newStates);const incrementSuccess = await incrementPeopleCountOptimized(court.id, court.docId);
                if (incrementSuccess) {
                  
                } else {
                  console.error(`❌ Failed to update database for ${court.id}`);
                }

                Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Entered ${court.id}`,
                    body: `You are now near ${court.id}! 🏀`,
                  },
                  trigger: null,
                });

              } else if (!isInside && wasInside) {

                const newStates = { ...currentStates, [court.id]: false };
                setInsideStates(newStates);
                await saveGeofenceStates(newStates);const decrementSuccess = await decrementPeopleCountOptimized(court.id, court.docId);
                if (decrementSuccess) {
                  
                } else {
                  console.error(`❌ Failed to update database for ${court.id}`);
                }

                Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Left ${court.id}`,
                    body: `You left the area of ${court.id}`,
                  },
                  trigger: null,
                });
              }

            }
          } catch (error) {
            console.error('Error in dynamic geofencing:', error);for (const court of nearbyCourts) {
              const isInside = geolib.isPointWithinRadius(
                { latitude, longitude },
                { latitude: court.latitude, longitude: court.longitude },
                court.radius
              );

              // Get the current state from AsyncStorage to avoid stale closure
              const savedStates = await AsyncStorage.getItem('geofenceStates');
              const currentStates = savedStates ? JSON.parse(savedStates) : {};
              const wasInside = currentStates[court.id] || false;

              if (isInside && !wasInside) {
                const newStates = { ...currentStates, [court.id]: true };
                setInsideStates(newStates);
                await saveGeofenceStates(newStates);const incrementSuccess = await incrementPeopleCountOptimized(court.id);
                if (incrementSuccess) {
                  
                } else {
                  console.error(`❌ Failed to update database (fallback) for ${court.id}`);
                }

                Notifications.scheduleNotificationAsync({
                  content: {
                    title: `Entered ${court.id}`,
                    body: `You are inside the geofence for ${court.id}`,
                  },
                  trigger: null,
                });

              } else if (!isInside && wasInside) {
                const newStates = { ...currentStates, [court.id]: false };
                setInsideStates(newStates);
                await saveGeofenceStates(newStates);const decrementSuccess = await decrementPeopleCountOptimized(court.id);
                if (decrementSuccess) {
                  
                } else {
                  console.error(`❌ Failed to update database (fallback) for ${court.id}`);
                }

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
        }
      );

      return () => {
        locationSubscription.then(sub => sub.remove());
      };
    })();
  }, [statesLoaded]); // REMOVED insideStates from dependencies to prevent multiple listeners!

  useEffect(() => {
    const refreshCourtData = async () => {
      if (userLocation) {
        const timestamp = new Date().toLocaleTimeString();setIsRefreshing(true);
        try {
          await fetchNearbyCourts(userLocation.latitude, userLocation.longitude);} catch (error) {
          console.error('Error refreshing court data:', error);
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    const refreshInterval = setInterval(refreshCourtData, 10000);

    return () => {
      clearInterval(refreshInterval);};
  }, [userLocation]); // Re-setup interval when user location changes

  const fetchNearbyCourts = async (lat: number, lng: number) => {
    try {const courtsCollection = collection(db, 'basketballCourts');
      const courtSnapshot = await getDocs(courtsCollection);

      const courtsList = courtSnapshot.docs.map(doc => {
        const data = doc.data();

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

        const currentlyOpen = isCourtCurrentlyOpen(data.openingHours);

        const peopleCount = data.peopleNumber || 0;

        return {
          place_id: doc.id,
          name: data.name || 'Unknown Court',
          latitude: latitude,
          longitude: longitude,
          address: data.address || 'Address not available',
          rating: data.rating,
          userRatingsTotal: data.userRatingsTotal,
          isOpen: currentlyOpen,
          peopleNumber: peopleCount,
          geohash: data.geohash,
          openingHours: data.openingHours,
        };
      });

      const nearbyCourtsList = courtsList.filter(court => {
        if (court.latitude === 0 && court.longitude === 0) return false;
        const distance = calculateDistanceKm(lat, lng, court.latitude, court.longitude);
        return distance <= 200; // Only show courts within 200km radius
      });

      nearbyCourtsList.slice(0, 5).forEach(court => {});

      setCourts(nearbyCourtsList);const totalPeople = nearbyCourtsList.reduce((sum, court) => sum + (court.peopleNumber || 0), 0);} catch (err) {
      console.error('Error fetching courts from Firebase:', err);
      Alert.alert('Error', 'Failed to load basketball courts from database.');
    }
  };

  /**
   * Optimized version that accepts coordinates (no permission requests)
   * Used for dynamic geofencing every 5 seconds
   */
  const getNearbyBasketballCourtsFromLocation = async (lat: number, lng: number): Promise<BasketballCourt[]> => {
    try {const fullGeohash = geohash.encode(lat, lng, 10);
      const userGeohash = fullGeohash.substring(0, 6);const courtsRef = collection(db, 'basketballCourts');

      const startRange = userGeohash;
      const endRange = userGeohash + '\uf8ff';

      const geohashQuery = query(
        courtsRef,
        where('geohash', '>=', startRange),
        where('geohash', '<', endRange),
        orderBy('geohash'),
        limit(20) // Reduced for faster frequent queries
      );

      const snapshot = await getDocs(geohashQuery);
      const basketballCourts: BasketballCourt[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as any;

        let courtLatitude = 0;
        let courtLongitude = 0;

        if (data.location) {
          if (data.location.latitude && data.location.longitude) {
            courtLatitude = data.location.latitude;
            courtLongitude = data.location.longitude;
          } else if (data.location._lat && data.location._long) {
            courtLatitude = data.location._lat;
            courtLongitude = data.location._long;
          }
        } else if (data.latitude && data.longitude) {
          courtLatitude = data.latitude;
          courtLongitude = data.longitude;
        }

        if (courtLatitude !== 0 && courtLongitude !== 0) {
          const court: BasketballCourt = {
            id: data.name || doc.id,
            latitude: courtLatitude,
            longitude: courtLongitude,
            radius: data.radius || 100,
            docId: doc.id,
          };
          basketballCourts.push(court);
        }
      });

      if (basketballCourts.length === 0) {return await getFallbackCourts(lat, lng, 2); // Small radius for frequent queries
      }

      basketballCourts.sort((a, b) => {
        const distA = calculateDistanceKm(lat, lng, a.latitude, a.longitude);
        const distB = calculateDistanceKm(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });

      setNearbyCourts(basketballCourts);return basketballCourts;

    } catch (error) {
      console.error('Error in dynamic court fetching:', error);
      return nearbyCourts; // Return existing state as fallback
    }
  };

  /**
   * Fallback function to query courts by radius when geohash returns no results
   */
  const getFallbackCourts = async (userLat: number, userLng: number, radiusKm: number = 5): Promise<BasketballCourt[]> => {
    try {const courtsRef = collection(db, 'basketballCourts');
      const allCourtsQuery = query(courtsRef, limit(100)); // Get more courts for radius filtering

      const snapshot = await getDocs(allCourtsQuery);
      const nearbyCourtsArray: BasketballCourt[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as any; // Type assertion for Firestore data

        let courtLatitude = 0;
        let courtLongitude = 0;

        if (data.location) {
          if (data.location.latitude && data.location.longitude) {
            courtLatitude = data.location.latitude;
            courtLongitude = data.location.longitude;
          } else if (data.location._lat && data.location._long) {
            courtLatitude = data.location._lat;
            courtLongitude = data.location._long;
          }
        } else if (data.latitude && data.longitude) {
          courtLatitude = data.latitude;
          courtLongitude = data.longitude;
        }

        if (courtLatitude !== 0 && courtLongitude !== 0) {
          const distance = calculateDistanceKm(userLat, userLng, courtLatitude, courtLongitude);

          if (distance <= radiusKm) {
            const court: BasketballCourt = {
              id: data.name || doc.id,
              latitude: courtLatitude,
              longitude: courtLongitude,
              radius: data.radius || 100,
              docId: doc.id,
            };

            nearbyCourtsArray.push(court);
          }
        }
      });

      nearbyCourtsArray.sort((a, b) => {
        const distA = calculateDistanceKm(userLat, userLng, a.latitude, a.longitude);
        const distB = calculateDistanceKm(userLat, userLng, b.latitude, b.longitude);
        return distA - distB;
      });setNearbyCourts(nearbyCourtsArray);

      return nearbyCourtsArray;

    } catch (error) {
      console.error('Error in radius fallback query:', error);
      return [];
    }
  };

  const navigateToCourtInfo = (court: Court) => {
    router.push({
      pathname: '/courts/court-info' as any,
      params: {
        courtData: JSON.stringify(court)
      }
    });
  };

  if (!region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const sortedCourts = courts.sort((a, b) => {
    if (!userLocation) return 0;
    const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
    const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
    return distA - distB;
  });

  return (
    <View style={styles.container}>
      {/* Chatbot Button */}
      <TouchableOpacity
        style={styles.chatbotButton}
        onPress={() => router.push('../SingaChat')}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#007BFF" />
        <Text style={styles.chatbotButtonText}>Singa</Text>
      </TouchableOpacity>
      {/* Search Bar */}
      <TouchableOpacity
        style={styles.search}
        onPress={() => router.push('/courts/search')}
        activeOpacity={0.7}
      >
        <View style={styles.searchContent}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search basketball courts</Text>
          {isRefreshing && (
            <View style={styles.refreshIndicator}>
              <ActivityIndicator size="small" color="#007BFF" />
              <Text style={styles.refreshText}>Updating...</Text>
            </View>
          )}
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
            onPress={() => navigateToCourtInfo(court)}
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
            onPress={() => navigateToCourtInfo(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.address && <Text style={styles.address}>{item.address}</Text>}
            {item.rating && (
              <Text style={styles.rating}>
                ⭐ {item.rating} ({item.userRatingsTotal ?? 0} reviews)
              </Text>
            )}
            {item.isOpen !== undefined && item.isOpen !== null && (
              <Text style={styles.openStatus}>
                {item.isOpen ? '🟢 Open now' : '🔴 Closed'}
              </Text>
            )}
            {item.isOpen === null && (
              <Text style={styles.openStatusUnknown}>
                ⏰ Hours not available
              </Text>
            )}
            {item.peopleNumber !== undefined && (
              <View style={styles.peopleCountContainer}>
                <Text style={styles.peopleCount}>
                  👥 {item.peopleNumber} people currently
                </Text>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
            )}
            {userLocation && (
              <Text style={styles.distance}>
                📍 {calculateDistanceKm(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude).toFixed(2)} km away
              </Text>
            )}

            {/* Add a visual indicator that the item is tappable */}
            <View style={styles.navigationHint}>
              <Ionicons name="chevron-forward" size={16} color="#007BFF" />
              <Text style={styles.navigationText}>Tap for court details</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatbotButton: {
    position: 'absolute',
    zIndex: 3,
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatbotButtonText: {
    marginLeft: 6,
    color: '#007BFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
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
    flex: 1,
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
  openStatusUnknown: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  peopleCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  peopleCount: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginRight: 4,
  },
  liveText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
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
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#007BFF',
    marginLeft: 4,
  },
});