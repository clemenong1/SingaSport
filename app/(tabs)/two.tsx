import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Text,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

const GOOGLE_API_KEY = 'AIzaSyB01KvNeXC7aRXmCAA3z6aKO4keIG7U244'; // Put your key here

interface Court {
  place_id: string;
  name: string;
  latitude: number;
  longitude: number;
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
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        showsUserLocation
      >
        <Marker
          coordinate={region}
          title="You are here"
          description="Your current location"
        />
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
      <FlatList
        data={courts.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        )}
        keyExtractor={(item) => item.place_id}
        style={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
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

