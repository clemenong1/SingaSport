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
const mapRef = useRef<MapViewType>(null);

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
  const [region, setRegion] = useState<Region | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

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
      console.error('Body:', err.response.data); // ← will show HTML error page
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
            mapRef.current.animateToRegion(region, 1000); // 1000ms animation
          }
        }}
        style={styles.locateButton}
      >
        <Ionicons name="locate" size={24} color="white" />
      </TouchableOpacity>
      </View>

      <FlatList
        data={courts.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        )}
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

// import React, { useEffect, useState } from 'react';
// import { StyleSheet, View, Dimensions, ActivityIndicator, Alert } from 'react-native';
// import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
// import * as Location from 'expo-location';

// export default function MapScreen(): React.JSX.Element {
//   const [region, setRegion] = useState<Region | null>(null);

//   useEffect(() => {
//     (async () => {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Permission denied', 'Location access is required to use this feature.');
//         return;
//       }

//       const location = await Location.getCurrentPositionAsync({});
//       const { latitude, longitude } = location.coords;

//       setRegion({
//         latitude,
//         longitude,
//         latitudeDelta: 0.01,
//         longitudeDelta: 0.01
//       });
//     })();
//   }, []);

//   if (!region) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#0000ff" />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <MapView
//         provider={PROVIDER_GOOGLE}
//         style={styles.map}
//         region={region}
//         showsUserLocation
//       >
//         <Marker
//           coordinate={region}
//           title="You are here"
//           description="Your current location"
//         />
//       </MapView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center'
//   },
//   map: {
//     width: Dimensions.get('window').width,
//     height: Dimensions.get('window').height
//   }
// });


