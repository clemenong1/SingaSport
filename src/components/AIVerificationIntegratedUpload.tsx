import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/FirebaseConfig';
import { aiVisionService } from '../services/aiVisionService';
import { tempStorageService } from '../services/tempStorageService';
import { AIVerificationStatusComponent } from './AIVerificationStatusComponent';
import { ImageUploadStatus, TempImageData, AIVerificationResponse } from '../types';

interface AIVerificationIntegratedUploadProps {
  reportDescription: string;
  courtContext?: string;
  type: 'report' | 'verification';
  contextId: string;
  userId: string;
  onSuccess: (imageData: TempImageData) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxImages?: number;
  currentImageCount?: number;
}

export const AIVerificationIntegratedUpload: React.FC<AIVerificationIntegratedUploadProps> = ({
  reportDescription,
  courtContext,
  type,
  contextId,
  userId,
  onSuccess,
  onError,
  disabled = false,
  maxImages = 5,
  currentImageCount = 0,
}) => {
  const [uploadStatus, setUploadStatus] = useState<ImageUploadStatus | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showImagePickerOptions = useCallback(() => {
    if (disabled || isProcessing) return;

    Alert.alert(
      'Add Photo for Verification',
      'Choose how you want to add a photo. The AI will verify it matches your description.',
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
  }, [disabled, isProcessing]);

  const requestPermissions = async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
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
        await processSelectedImage(result.assets[0].uri);
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
        await processSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const processSelectedImage = async (imageUri: string): Promise<void> => {
    if (!aiVisionService.isAvailable()) {
      Alert.alert(
        'AI Service Unavailable',
        'AI verification is temporarily unavailable. You can still upload the photo, but it won\'t be verified.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upload Anyway', onPress: () => uploadWithoutVerification(imageUri) },
        ]
      );
      return;
    }

    setIsProcessing(true);
    setSelectedImage(imageUri);

    try {
      // Phase 1: Upload to temporary storage
      setUploadStatus({
        phase: 'uploading',
        progress: 0,
        message: 'Uploading image for AI verification...',
      });

      const tempUrl = await tempStorageService.uploadToTemp(
        imageUri,
        type,
        contextId,
        userId,
        (progress) => {
          setUploadStatus(prev => prev ? { ...prev, progress } : null);
        }
      );

      // Phase 2: AI Verification
      setUploadStatus({
        phase: 'analyzing',
        progress: 100,
        message: 'AI is analyzing your photo to verify it matches the description...',
      });

      const verificationResult = await aiVisionService.verifyImageMatch({
        imageUrl: tempUrl,
        reportDescription,
        courtContext,
      });

      if (verificationResult.isMatch) {
        // Phase 3: Move to permanent storage
        setUploadStatus({
          phase: 'verified',
          progress: 100,
          message: 'Photo verified successfully! Moving to permanent storage...',
          aiVerification: verificationResult,
        });

        // For verified images, upload directly to permanent storage
        // to avoid the complex URL parsing in moveToPermStorage
        let permanentUrl: string;
        try {
          permanentUrl = await tempStorageService.moveToPermStorage(
            tempUrl,
            type,
            contextId,
            userId
          );
        } catch (moveError) {
          console.warn('Move failed, uploading directly to permanent storage:', moveError);
          // Fallback: Upload directly to permanent storage
                     permanentUrl = await uploadDirectlyToPermanent(imageUri, type, contextId, userId);
          // Clean up temp file
          await tempStorageService.deleteTemp(tempUrl);
        }

        // Success!
        const imageData: TempImageData = {
          uri: imageUri,
          id: Date.now().toString(),
          tempStorageUrl: tempUrl,
          permanentStorageUrl: permanentUrl,
          aiVerified: true,
          verificationResponse: verificationResult,
        };

        setUploadStatus({
          phase: 'verified',
          progress: 100,
          message: `Photo verified with ${verificationResult.confidence}% confidence!`,
          aiVerification: verificationResult,
        });

        onSuccess(imageData);

        // Reset after delay
        setTimeout(() => {
          resetState();
        }, 3000);

      } else {
        // Verification failed
        setUploadStatus({
          phase: 'failed',
          progress: 100,
          message: 'Photo does not match the reported condition.',
          aiVerification: verificationResult,
        });

        // Clean up temp file
        await tempStorageService.deleteTemp(tempUrl);

        // Show detailed feedback
        Alert.alert(
          'Verification Failed',
          verificationResult.feedback || 'The photo doesn\'t match the reported condition. Please try taking another photo that clearly shows the issue.',
          [
            { text: 'Try Again', onPress: resetState },
            { text: 'Cancel', style: 'cancel', onPress: resetState },
          ]
        );
      }

    } catch (error: any) {
      console.error('Error processing image:', error);
      
      setUploadStatus({
        phase: 'failed',
        progress: 0,
        message: 'Failed to process image',
        error: error,
      });

      onError?.(error.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadWithoutVerification = async (imageUri: string): Promise<void> => {
    try {
      setIsProcessing(true);
      setSelectedImage(imageUri);

      setUploadStatus({
        phase: 'uploading',
        progress: 0,
        message: 'Uploading image without AI verification...',
      });

      const permanentUrl = await tempStorageService.uploadToTemp(
        imageUri,
        type,
        contextId,
        userId,
        (progress) => {
          setUploadStatus(prev => prev ? { ...prev, progress } : null);
        }
      );

      const imageData: TempImageData = {
        uri: imageUri,
        id: Date.now().toString(),
        permanentStorageUrl: permanentUrl,
        aiVerified: false,
      };

      setUploadStatus({
        phase: 'verified',
        progress: 100,
        message: 'Image uploaded successfully (not AI verified)',
      });

      onSuccess(imageData);

      setTimeout(() => {
        resetState();
      }, 2000);

    } catch (error: any) {
      console.error('Error uploading without verification:', error);
      setUploadStatus({
        phase: 'failed',
        progress: 0,
        message: 'Failed to upload image',
        error: error,
      });
      onError?.(error.message || 'Failed to upload image');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = (): void => {
    setUploadStatus(null);
    setSelectedImage(null);
    setIsProcessing(false);
  };

  const handleRetry = (): void => {
    if (selectedImage) {
      processSelectedImage(selectedImage);
    } else {
      resetState();
    }
  };

  const uploadDirectlyToPermanent = async (
    imageUri: string,
    type: 'report' | 'verification',
    contextId: string,
    userId: string
  ): Promise<string> => {
    // Convert image URI to blob
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();

    // Generate permanent path
    const timestamp = Date.now();
    const fileName = `${type}_${contextId}_${userId}_${timestamp}.jpg`;
    const permanentPath = `verified/${type}/${contextId}/${fileName}`;

    // Upload directly to permanent location
    const permanentRef = ref(storage, permanentPath);
    const uploadTask = uploadBytesResumable(permanentRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {}, // No progress callback needed
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const handleCancel = (): void => {
    if (uploadStatus && uploadStatus.phase !== 'verified') {
      Alert.alert(
        'Cancel Upload',
        'Are you sure you want to cancel the upload?',
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'Cancel Upload', style: 'destructive', onPress: resetState },
        ]
      );
    } else {
      resetState();
    }
  };

  const isAtMaxImages = currentImageCount >= maxImages;

  return (
    <View style={styles.container}>
      {/* Upload Button */}
      {!uploadStatus && (
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (disabled || isAtMaxImages) && styles.uploadButtonDisabled
          ]}
          onPress={showImagePickerOptions}
          disabled={disabled || isAtMaxImages}
        >
          <Ionicons 
            name="camera-outline" 
            size={24} 
            color={disabled || isAtMaxImages ? '#CCC' : '#007AFF'} 
          />
          <Text style={[
            styles.uploadButtonText,
            (disabled || isAtMaxImages) && styles.uploadButtonTextDisabled
          ]}>
            {isAtMaxImages ? `Maximum ${maxImages} photos` : 'Add AI-Verified Photo'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Image Preview */}
      {selectedImage && uploadStatus && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
        </View>
      )}

      {/* Verification Status */}
      {uploadStatus && (
        <AIVerificationStatusComponent
          status={uploadStatus}
          onRetry={handleRetry}
          onCancel={handleCancel}
          showDetails={true}
        />
      )}

      {/* Service Status */}
      {!aiVisionService.isAvailable() && !uploadStatus && (
        <View style={styles.serviceWarning}>
          <Ionicons name="warning-outline" size={16} color="#FF9500" />
          <Text style={styles.serviceWarningText}>
            AI verification temporarily unavailable
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  uploadButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCC',
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  uploadButtonTextDisabled: {
    color: '#CCC',
  },
  imagePreviewContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  serviceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  serviceWarningText: {
    fontSize: 12,
    color: '#FF9500',
    marginLeft: 6,
  },
}); 