import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../src/services/FirebaseConfig';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { userService } from '../../src/utils/userService';

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

interface ReportImage {
  uri: string;
  id: string;
}

export default function ReportPageScreen() {
  const params = useLocalSearchParams();
  const [court, setCourt] = useState<Court | null>(null);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<ReportImage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.courtData) {
      try {
        const courtData = JSON.parse(params.courtData as string) as Court;
        setCourt(courtData);
      } catch (error) {
        console.error('Error parsing court data:', error);
        Alert.alert('Error', 'Invalid court data');
        router.back();
      }
    }
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera roll permissions to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage: ReportImage = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
        };
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage: ReportImage = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
        };
        setImages([...images, newImage]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (imageId: string) => {
    setImages(images.filter(img => img.id !== imageId));
  };

  const uploadImageToStorage = async (imageUri: string, reportId: string, imageIndex: number): Promise<string> => {
    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create storage reference
      const fileName = `report_${reportId}_${imageIndex}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `reportPhotos/${reportId}/${fileName}`);

      // Upload image
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress monitoring (optional)
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose how you want to add a photo',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description of the issue.');
      return false;
    }
    if (description.trim().length < 10) {
      Alert.alert('Description too short', 'Please provide more details about the issue (at least 10 characters).');
      return false;
    }
    return true;
  };

  const submitReport = async () => {
    if (!validateForm() || !court || !auth.currentUser) return;

    setLoading(true);
    try {
      // First create the report document
      const reportData = {
        courtId: court.place_id,
        courtName: court.name,
        description: description.trim(),
        user: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
        reportedAt: serverTimestamp(),
        imageCount: images.length,
        status: 'open', // Can be 'open', 'investigating', 'resolved'
      };

      const reportsRef = collection(db, 'basketballCourts', court.place_id, 'reports');
      const reportDoc = await addDoc(reportsRef, reportData);
      const reportId = reportDoc.id;

      // Upload images if any
      let photoUrls: string[] = [];
      if (images.length > 0) {
        try {
          const uploadPromises = images.map((image, index) => 
            uploadImageToStorage(image.uri, reportId, index)
          );
          photoUrls = await Promise.all(uploadPromises);
          
          // Update the report with photo URLs
          await updateDoc(doc(db, 'basketballCourts', court.place_id, 'reports', reportId), {
            photoUrls: photoUrls,
            imageCount: photoUrls.length
          });
        } catch (uploadError) {
          console.error('Error uploading images:', uploadError);
          // Continue with report submission even if image upload fails
        }
      }

      // Award points for submitting a report
      try {
        // Ensure user profile exists before awarding points
        await userService.ensureUserProfileExists(auth.currentUser.uid, auth.currentUser.email || undefined);
        await userService.awardPointsForReport(auth.currentUser.uid);
        Alert.alert(
          'Report Submitted',
          `Thank you for reporting this issue! You earned 10 points for your contribution. ${photoUrls.length > 0 ? `Your ${photoUrls.length} photo(s) have been uploaded.` : ''} The court management will review your report.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
        // Still show success message even if points fail
        Alert.alert(
          'Report Submitted',
          `Thank you for reporting this issue! ${photoUrls.length > 0 ? `Your ${photoUrls.length} photo(s) have been uploaded.` : ''} The court management will review your report.`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (description.trim() || images.length > 0) {
      Alert.alert(
        'Discard Report',
        'Are you sure you want to discard this report?',
        [
          { text: 'Continue Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  if (!court) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <TouchableOpacity
          onPress={submitReport}
          style={[styles.headerButton, loading && styles.disabledButton]}
          disabled={loading}
        >
          <Text style={[styles.submitButtonText, loading && styles.disabledText]}>
            {loading ? 'Submitting...' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Court Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Court Information</Text>
          <View style={styles.courtCard}>
            <Ionicons name="basketball-outline" size={24} color="#FF6B6B" />
            <View style={styles.courtInfo}>
              <Text style={styles.courtName}>{court.name}</Text>
              <Text style={styles.courtAddress}>{court.address}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Description</Text>
          <Text style={styles.sectionSubtitle}>
            Please describe the issue you encountered at this court
          </Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="What happened to the court? e.g., slippery floor, closed for event, broken hoop..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <Text style={styles.characterCount}>
            {description.length}/500 characters
          </Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Add photos to help illustrate the issue
          </Text>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
              {images.map((image) => (
                <View key={image.id} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(image.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.addPhotoButton} onPress={showImageOptions}>
            <Ionicons name="camera-outline" size={24} color="#666" />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reporting Guidelines</Text>
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.guidelineText}>Be specific and accurate in your description</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.guidelineText}>Include photos when possible</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.guidelineText}>Report genuine issues only</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="close-circle-outline" size={20} color="#F44336" />
              <Text style={styles.guidelineText}>Do not include personal information</Text>
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  courtCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  courtInfo: {
    flex: 1,
    marginLeft: 16,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  courtAddress: {
    fontSize: 14,
    color: '#666',
  },
  descriptionInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addPhotoButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  guidelinesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidelineText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
});