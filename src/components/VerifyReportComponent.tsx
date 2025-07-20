import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, storage, auth } from '../services/FirebaseConfig';
import { userService } from '../utils/userService';

interface VerifyReportComponentProps {
  courtId: string;
  reportId: string;
}

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

const VerifyReportComponent: React.FC<VerifyReportComponentProps> = ({
  courtId,
  reportId,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ 
    bytesTransferred: 0, 
    totalBytes: 0, 
    percentage: 0 
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const requestPermissions = async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
  };

  const showImagePickerOptions = (): void => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo for verification',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openImageLibrary(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async (): Promise<void> => {
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
        setSelectedImage(result.assets[0].uri);
        await uploadImageAndCreateVerification(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openImageLibrary = async (): Promise<void> => {
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
        setSelectedImage(result.assets[0].uri);
        await uploadImageAndCreateVerification(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const uploadImageAndCreateVerification = async (imageUri: string): Promise<void> => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to verify reports.');
      return;
    }

    const userId = auth.currentUser.uid;
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}.jpg`;
    const storagePath = `reportVerifications/${courtId}/${reportId}/${fileName}`;

    setIsUploading(true);
    setUploadProgress({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });

    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Upload with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          };
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          setIsUploading(false);
          Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
        },
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Create verification document in Firestore
            const verificationsRef = collection(
              db, 
              'basketballCourts', 
              courtId, 
              'reports', 
              reportId, 
              'verifications'
            );

            await addDoc(verificationsRef, {
              verifierId: userId,
              photoUrl: downloadURL,
              timestamp: serverTimestamp(),
              aiVerified: false,
            });

            // Award points for verification
            try {
              // Ensure user profile exists before awarding points
              await userService.ensureUserProfileExists(userId, auth.currentUser?.email || undefined);
              await userService.awardPointsForVerification(userId);
              Alert.alert(
                'Success!', 
                'Your verification photo has been submitted successfully. You earned 10 points for helping verify this report!',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setIsSuccess(false);
                      setSelectedImage(null);
                    },
                  },
                ]
              );
            } catch (pointsError) {
              console.error('Error awarding points:', pointsError);
              // Still show success message even if points fail
              Alert.alert(
                'Success!', 
                'Your verification photo has been submitted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setIsSuccess(false);
                      setSelectedImage(null);
                    },
                  },
                ]
              );
            }

            setIsUploading(false);
            setIsSuccess(true);
          } catch (firestoreError) {
            console.error('Firestore error:', firestoreError);
            setIsUploading(false);
            Alert.alert('Error', 'Failed to save verification. Please try again.');
          }
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsUploading(false);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    }
  };

  const resetComponent = (): void => {
    setSelectedImage(null);
    setIsSuccess(false);
    setUploadProgress({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });
  };

  if (isSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Verification Submitted!</Text>
          <Text style={styles.successMessage}>
            Thank you for helping verify this court report. Your photo has been uploaded successfully.
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetComponent}>
            <Text style={styles.resetButtonText}>Submit Another Verification</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Help Verify This Report</Text>
        <Text style={styles.description}>
          Take a photo of the current court conditions to help verify this report's accuracy.
        </Text>
        
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          </View>
        )}

        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.uploadingText}>
              Uploading photo... {uploadProgress.percentage}%
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${uploadProgress.percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(uploadProgress.bytesTransferred / 1024)} KB / {Math.round(uploadProgress.totalBytes / 1024)} KB
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.verifyButton} 
            onPress={showImagePickerOptions}
            activeOpacity={0.8}
          >
            <Text style={styles.verifyButtonText}>📸 Verify This Report</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  imagePreviewContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  uploadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: 200,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default VerifyReportComponent; 