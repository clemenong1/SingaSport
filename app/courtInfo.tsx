import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { isCourtCurrentlyOpen } from '../src/utils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

interface CourtPhoto {
  id: string;
  uri: string;
  caption?: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export default function CourtInfoScreen() {
  const params = useLocalSearchParams();
  const [court, setCourt] = useState<Court | null>(null);
  const [photos, setPhotos] = useState<CourtPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string>('');

  useEffect(() => {
    initializeCourtInfo();
  }, []);

  const initializeCourtInfo = async () => {
    try {
      // Parse court data from params
      if (params.courtData) {
        const courtData = JSON.parse(params.courtData as string) as Court;
        setCourt(courtData);
        
        // Get user location for distance calculation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          // Calculate distance
          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            courtData.latitude,
            courtData.longitude
          );
          setDistance(dist.toFixed(2));
        }
        
        // Load sample photos (in real app, fetch from Firebase)
        loadCourtPhotos(courtData.place_id);
      }
    } catch (error) {
      console.error('Error initializing court info:', error);
      Alert.alert('Error', 'Failed to load court information');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  const loadCourtPhotos = (courtId: string) => {
    // Sample photos - in real app, fetch from Firebase Storage
    const samplePhotos: CourtPhoto[] = [
      {
        id: '1',
        uri: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        caption: 'Main court view',
        uploadedBy: 'User123',
        uploadedAt: '2024-01-15'
      },
      {
        id: '2',
        uri: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
        caption: 'Court from another angle',
        uploadedBy: 'Player456',
        uploadedAt: '2024-01-12'
      }
    ];
    setPhotos(samplePhotos);
  };

  const openInMaps = () => {
    if (!court) return;
    
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${court.latitude},${court.longitude}`;
    const label = court.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const getOpenStatusColor = (isOpen: boolean | null) => {
    if (isOpen === null) return '#888';
    return isOpen ? '#4CAF50' : '#F44336';
  };

  const getOpenStatusText = (isOpen: boolean | null) => {
    if (isOpen === null) return 'Hours not available';
    return isOpen ? 'Open now' : 'Closed';
  };

  const renderPhoto = ({ item }: { item: CourtPhoto }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
      {item.caption && (
        <View style={styles.photoCaption}>
          <Text style={styles.photoCaptionText}>{item.caption}</Text>
        </View>
      )}
    </View>
  );

  const renderOpeningHours = () => {
    if (!court?.openingHours || !Array.isArray(court.openingHours)) {
      return (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoText}>Opening hours not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.openingHoursContainer}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoLabel}>Opening Hours</Text>
        </View>
        {court.openingHours.map((hours, index) => (
          <Text key={index} style={styles.openingHoursText}>
            {hours}
          </Text>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading court information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!court) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>Court information not available</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {court.name}
        </Text>
        <TouchableOpacity onPress={openInMaps} style={styles.headerButton}>
          <Ionicons name="navigate-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image/Map Section */}
        <View style={styles.heroSection}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.mapView}
            region={{
              latitude: court.latitude,
              longitude: court.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: court.latitude,
                longitude: court.longitude,
              }}
              title={court.name}
              description={court.address}
            />
          </MapView>
          

        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color="#FFB400" />
            <Text style={styles.statValue}>
              {court.rating ? court.rating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#007AFF" />
            <Text style={styles.statValue}>
              {court.peopleNumber || 0}
            </Text>
            <Text style={styles.statLabel}>People</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="location" size={20} color="#34C759" />
            <Text style={styles.statValue}>
              {distance ? `${distance} km` : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>

        {/* Court Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Court Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.infoText}>{court.address}</Text>
            </View>
            
            {court.rating && (
              <View style={styles.infoRow}>
                <Ionicons name="star-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  {court.rating.toFixed(1)} stars ({court.userRatingsTotal || 0} reviews)
                </Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                {court.peopleNumber || 0} people currently playing
              </Text>
            </View>

            {renderOpeningHours()}
          </View>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity style={styles.addPhotoButton}>
              <Ionicons name="camera-outline" size={20} color="#007AFF" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
          
          {photos.length > 0 ? (
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
            />
          ) : (
            <View style={styles.noPhotosContainer}>
              <Ionicons name="camera-outline" size={48} color="#CCC" />
              <Text style={styles.noPhotosText}>No photos yet</Text>
              <Text style={styles.noPhotosSubtext}>Be the first to add a photo!</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={openInMaps}>
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.actionButtonText}>Get Directions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share Court</Text>
          </TouchableOpacity>
        </View>

        {/* Future Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonItem}>
              <Ionicons name="calendar-outline" size={24} color="#666" />
              <Text style={styles.comingSoonText}>Court Booking</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="chatbubbles-outline" size={24} color="#666" />
              <Text style={styles.comingSoonText}>Player Reviews</Text>
            </View>
            <View style={styles.comingSoonItem}>
              <Ionicons name="fitness-outline" size={24} color="#666" />
              <Text style={styles.comingSoonText}>Court Conditions</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    height: 240,
    position: 'relative',
  },
  mapView: {
    flex: 1,
  },

  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  openingHoursContainer: {
    marginTop: 8,
  },
  openingHoursText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
    marginBottom: 4,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPhotoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  photosContainer: {
    paddingVertical: 8,
  },
  photoContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: 160,
    height: 120,
    borderRadius: 12,
  },
  photoCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  photoCaptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  noPhotosContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noPhotosText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  comingSoonCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  comingSoonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
}); 