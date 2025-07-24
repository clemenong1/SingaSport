import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { courtPhotoService, CourtPhoto, UploadProgress } from '../../src/services/courtPhotoService';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../src/services/FirebaseConfig';

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

interface Report {
  id: string;
  description: string;
  reportedAt: any;
  status: 'open' | 'investigating' | 'resolved';
  courtId: string;
}

export default function CourtInfoScreen() {
  const params = useLocalSearchParams();
  const [court, setCourt] = useState<Court | null>(null);
  const [photos, setPhotos] = useState<CourtPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    initializeCourtInfo();
  }, []);

  const initializeCourtInfo = async () => {
    try {
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

          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            courtData.latitude,
            courtData.longitude
          );
          setDistance(dist.toFixed(2));
        }

        // Load court photos from Firestore
        await loadCourtPhotos(courtData.place_id);

        // Load court reports
        loadCourtReports(courtData.place_id);
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
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else {
      setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  const sortPhotosByDate = (photos: CourtPhoto[]): CourtPhoto[] => {
    return photos.sort((a, b) => {
      const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(a.uploadedAt || 0);
      const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(b.uploadedAt || 0);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });
  };

  const loadCourtPhotos = async (courtId: string) => {
    try {
      setPhotoLoading(true);
      const userPhotos = await courtPhotoService.loadCourtPhotos(courtId, 10);
      
      // Sort photos by upload date (most recent first) as additional safety measure
      const sortedPhotos = sortPhotosByDate(userPhotos);
      
      setPhotos(sortedPhotos);
    } catch (error) {
      console.error('Error loading court photos:', error);
      // If no user photos, show placeholder message instead of generic photos
      setPhotos([]);
    } finally {
      setPhotoLoading(false);
    }
  };

  const loadCourtReports = async (courtId: string) => {
    try {
      setLoadingReports(true);
      const reportsRef = collection(db, 'basketballCourts', courtId, 'reports');
      const q = query(reportsRef, orderBy('reportedAt', 'desc'), limit(3));
      const querySnapshot = await getDocs(q);

      const reportsData: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsData.push({
          id: doc.id,
          description: data.description,
          reportedAt: data.reportedAt,
          status: data.status || 'open',
          courtId: courtId,
        });
      });

      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const showImagePickerOptions = () => {
    if (!auth.currentUser) {
      Alert.alert('Authentication Required', 'Please log in to upload photos.');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo of this court',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openPhotoLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const requestPermissions = async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
  };

  const openCamera = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera and photo library permissions are required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openPhotoLibrary = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Photo library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening photo library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const uploadPhoto = async (imageUri: string) => {
    if (!court) return;

    setUploading(true);
    setUploadProgress({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });

    try {
      const uploadedPhoto = await courtPhotoService.uploadCourtPhoto(
        imageUri,
        court.place_id,
        '', // No caption for now
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // Add the new photo and re-sort to ensure proper ordering
      setPhotos((prevPhotos) => {
        const updatedPhotos = [uploadedPhoto, ...prevPhotos];
        return sortPhotosByDate(updatedPhotos);
      });

      Alert.alert('Success', 'Photo uploaded successfully! Thank you for contributing to the community.');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });
    }
  };

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoViewerVisible(true);
  };

  const closePhotoViewer = () => {
    setPhotoViewerVisible(false);
  };

  const navigateToReport = () => {
    if (court) {
      router.push({
        pathname: '/courts/report-page',
        params: { courtData: JSON.stringify(court) }
      });
    }
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

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF6B6B';
      case 'investigating': return '#FFA726';
      case 'resolved': return '#4CAF50';
      default: return '#666';
    }
  };

  const getReportStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'investigating': return 'Investigating';
      case 'resolved': return 'Resolved';
      default: return 'Unknown';
    }
  };

  const formatReportDate = (reportedAt: any) => {
    if (!reportedAt) return 'Unknown date';

    try {
      // Handle Firestore timestamp
      const date = reportedAt.toDate ? reportedAt.toDate() : new Date(reportedAt);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInDays < 7) {
        return `${Math.floor(diffInDays)}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown date';
    }
  };

  const renderPhoto = ({ item, index }: { item: CourtPhoto; index: number }) => (
    <TouchableOpacity onPress={() => openPhotoViewer(index)}>
      <View style={styles.photoContainer}>
        <Image source={{ uri: item.uri }} style={styles.photo} />
        {item.aiVerified && (
          <View style={styles.verificationBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
            <Text style={styles.verificationText}>AI Verified</Text>
          </View>
        )}
        <View style={styles.photoCaption}>
          {item.uploadedByName && item.uploadedByName !== 'Anonymous User' && item.uploadedByName !== 'Anonymous' && (
            <Text style={styles.photoCaptionText}>
              By {item.uploadedByName}
            </Text>
          )}
          <Text style={styles.photoDateText}>
            {courtPhotoService.formatUploadDate(item.uploadedAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOpeningHours = () => {
    if (!court?.openingHours || court.openingHours.length === 0) {
      return (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.infoText}>Opening hours not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={20} color="#666" />
        <View style={styles.openingHoursContainer}>
          <Text style={styles.infoLabel}>Opening Hours:</Text>
          {court.openingHours.slice(0, 3).map((hours, index) => (
            <Text key={index} style={styles.openingHoursText}>{hours}</Text>
          ))}
          {court.openingHours.length > 3 && (
            <Text style={styles.openingHoursText}>...and {court.openingHours.length - 3} more</Text>
          )}
        </View>
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
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>Court not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
            <Ionicons name="people" size={20} color="#007AFF" />
            <Text style={styles.statNumber}>{court.peopleNumber || 0}</Text>
            <Text style={styles.statLabel}>Playing Now</Text>
          </View>
          
          {court.rating && (
            <View style={styles.statItem}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.statNumber}>{court.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          )}
          
          {distance && (
            <View style={styles.statItem}>
              <Ionicons name="location" size={20} color="#4CAF50" />
              <Text style={styles.statNumber}>{distance}</Text>
              <Text style={styles.statLabel}>km away</Text>
            </View>
          )}
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
            <TouchableOpacity 
              style={[styles.addPhotoButton, uploading && styles.addPhotoButtonDisabled]} 
              onPress={showImagePickerOptions}
              disabled={uploading}
            >
              <Ionicons 
                name={uploading ? "hourglass-outline" : "camera-outline"} 
                size={20} 
                color={uploading ? "#999" : "#007AFF"} 
              />
              <Text style={[styles.addPhotoText, uploading && styles.addPhotoTextDisabled]}>
                {uploading ? `Uploading ${uploadProgress.percentage}%` : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {photoLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>Loading photos...</Text>
            </View>
          ) : photos.length > 0 ? (
            <FlatList
              data={photos}
              renderItem={renderPhoto}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosContainer}
              keyExtractor={(item) => item.id}
            />
          ) : (
            <View style={styles.noPhotosContainer}>
              <Ionicons name="camera-outline" size={48} color="#CCC" />
              <Text style={styles.noPhotosText}>No photos yet</Text>
              <Text style={styles.noPhotosSubtext}>Be the first to add a photo of this court!</Text>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadProgressContainer}>
              <View style={styles.uploadProgressBar}>
                <View 
                  style={[styles.uploadProgressFill, { width: `${uploadProgress.percentage}%` }]} 
                />
              </View>
              <Text style={styles.uploadProgressText}>
                Uploading... {uploadProgress.percentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Recent Reports Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          
          {loadingReports ? (
            <View style={styles.reportsLoadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.reportsLoadingText}>Loading reports...</Text>
            </View>
          ) : reports.length > 0 ? (
            <View style={styles.viewReportsButton}>
              <View style={styles.viewReportsContent}>
                <View style={styles.viewReportsHeader}>
                  <View style={styles.viewReportsInfo}>
                    <Text style={styles.viewReportsTitle}>
                      {reports.length} Recent Report{reports.length > 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.viewReportsSubtitle}>
                      Latest: {formatReportDate(reports[0]?.reportedAt)}
                    </Text>
                  </View>
                  <View style={styles.reportStatusIndicators}>
                    {reports.slice(0, 3).map((report, index) => (
                      <View
                        key={index}
                        style={[
                          styles.reportStatusDot,
                          { backgroundColor: getReportStatusColor(report.status) }
                        ]}
                      />
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.viewAllReportsButton}
                  onPress={() => router.push({
                    pathname: '/courts/reports-list',
                    params: { courtData: JSON.stringify(court) }
                  })}
                >
                  <Text style={styles.viewAllReportsText}>View All Reports</Text>
                  <Ionicons name="chevron-forward" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.comingSoonCard}>
              <View style={styles.comingSoonItem}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.comingSoonText}>No recent reports - Court looks good!</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => navigateToReport()}
          >
            <Ionicons name="flag-outline" size={20} color="#FF6B6B" />
            <Text style={[styles.actionButtonText, styles.reportButtonText]}>Report an Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openInMaps}>
            <Ionicons name="navigate" size={20} color="white" />
            <Text style={styles.actionButtonText}>Get Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share Court</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      <Modal
        visible={photoViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closePhotoViewer}
      >
        <StatusBar hidden />
        <View style={styles.modalOverlay}>
          {/* Header with close button and photo counter */}
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closePhotoViewer}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalPhotoCounter}>
              {selectedPhotoIndex + 1} / {photos.length}
            </Text>
          </View>

          {/* Photo display */}
          <View style={styles.modalImageContainer}>
            {photos[selectedPhotoIndex] && (
              <Image
                source={{ uri: photos[selectedPhotoIndex].uri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            {/* Navigation buttons (only show if more than one photo) */}
            {photos.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.modalNavButton, styles.modalNavButtonLeft]} 
                  onPress={() => navigatePhoto('prev')}
                >
                  <Ionicons name="chevron-back" size={30} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalNavButton, styles.modalNavButtonRight]} 
                  onPress={() => navigatePhoto('next')}
                >
                  <Ionicons name="chevron-forward" size={30} color="white" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Photo information */}
          <View style={styles.modalFooter}>
            <View style={styles.modalPhotoInfo}>
              {photos[selectedPhotoIndex]?.aiVerified && (
                <View style={styles.modalVerificationBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.modalVerificationText}>AI Verified</Text>
                </View>
              )}
              {photos[selectedPhotoIndex]?.uploadedByName && 
               photos[selectedPhotoIndex]?.uploadedByName !== 'Anonymous User' && 
               photos[selectedPhotoIndex]?.uploadedByName !== 'Anonymous' && (
                <Text style={styles.modalPhotoUploader}>
                  By {photos[selectedPhotoIndex]?.uploadedByName}
                </Text>
              )}
              <Text style={styles.modalPhotoDate}>
                {photos[selectedPhotoIndex] && courtPhotoService.formatUploadDate(photos[selectedPhotoIndex].uploadedAt)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
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
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    height: 200,
    backgroundColor: '#DDD',
  },
  mapView: {
    flex: 1,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 20,
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
  addPhotoButtonDisabled: {
    opacity: 0.7,
  },
  addPhotoTextDisabled: {
    color: '#999',
  },
  photosContainer: {
    paddingVertical: 8,
  },
  photoContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
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
  photoDateText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  verificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verificationText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 2,
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
  uploadProgressContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  uploadProgressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  uploadProgressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
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
  reportButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  reportButtonText: {
    color: '#FF6B6B',
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
  reportsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reportsLoadingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  viewReportsButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewReportsContent: {
    padding: 16,
  },
  viewReportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewReportsInfo: {
    flex: 1,
  },
  viewReportsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewReportsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  reportStatusIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  reportStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  viewAllReportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  viewAllReportsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  modalPhotoCounter: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  modalImageContainer: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    padding: 10,
    zIndex: 1,
  },
  modalNavButtonLeft: {
    left: 10,
  },
  modalNavButtonRight: {
    right: 10,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  modalPhotoInfo: {
    alignItems: 'center',
  },
  modalVerificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  modalVerificationText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalPhotoUploader: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
    marginBottom: 2,
  },
  modalPhotoDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});