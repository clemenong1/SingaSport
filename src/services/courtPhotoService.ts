import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { storage, db, auth } from './FirebaseConfig';

export interface CourtPhoto {
  id: string;
  uri: string;
  caption?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: any; // Firestore timestamp
  courtId: string;
  aiVerified?: boolean;
  verificationResponse?: any;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

class CourtPhotoService {
  private static instance: CourtPhotoService;

  private constructor() {}

  public static getInstance(): CourtPhotoService {
    if (!CourtPhotoService.instance) {
      CourtPhotoService.instance = new CourtPhotoService();
    }
    return CourtPhotoService.instance;
  }

  /**
   * Upload a photo for a specific court
   */
  public async uploadCourtPhoto(
    imageUri: string,
    courtId: string,
    caption?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CourtPhoto> {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to upload photos');
    }

    const userId = auth.currentUser.uid;
    const userName = auth.currentUser.displayName || 'Anonymous User';
    const timestamp = Date.now();
    const fileName = `court_${courtId}_${userId}_${timestamp}.jpg`;
    const storagePath = `indivcourts/${courtId}/${fileName}`;

    try {
      // Convert image URI to blob
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, storagePath);

      // Upload with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress: UploadProgress = {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            };
            onProgress?.(progress);
          },
          (error) => {
            console.error('Court photo upload error:', error);
            reject(new Error(`Failed to upload photo: ${error.message}`));
          },
          async () => {
            try {
              // Get download URL
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

              // Create photo document in Firestore
              const photosRef = collection(db, 'basketballCourts', courtId, 'photos');
              const photoDoc = await addDoc(photosRef, {
                uri: downloadURL,
                caption: caption || '',
                uploadedBy: userId,
                uploadedByName: userName,
                uploadedAt: serverTimestamp(),
                courtId: courtId,
                aiVerified: false, // Default to false unless AI verified
                storagePath: storagePath,
              });

              const courtPhoto: CourtPhoto = {
                id: photoDoc.id,
                uri: downloadURL,
                caption: caption || '',
                uploadedBy: userId,
                uploadedByName: userName,
                uploadedAt: new Date(), // Use current date as approximation
                courtId: courtId,
                aiVerified: false,
              };

              resolve(courtPhoto);
            } catch (firestoreError) {
              console.error('Firestore error while saving photo metadata:', firestoreError);
              reject(new Error(`Failed to save photo metadata: ${firestoreError}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading court photo:', error);
      throw new Error(`Failed to process image for upload: ${error}`);
    }
  }

  /**
   * Upload an AI-verified court photo
   */
  public async uploadAIVerifiedCourtPhoto(
    imageUri: string,
    courtId: string,
    caption?: string,
    verificationResponse?: any,
    permanentUrl?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<CourtPhoto> {
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to upload photos');
    }

    const userId = auth.currentUser.uid;
    const userName = auth.currentUser.displayName || 'Anonymous User';

    try {
      let downloadURL: string;

      if (permanentUrl) {
        // Use the already uploaded permanent URL
        downloadURL = permanentUrl;
      } else {
        // Upload if no permanent URL provided
        const uploadResult = await this.uploadCourtPhoto(imageUri, courtId, caption, onProgress);
        downloadURL = uploadResult.uri;
      }

      // Create photo document in Firestore with AI verification
      const photosRef = collection(db, 'basketballCourts', courtId, 'photos');
      const photoDoc = await addDoc(photosRef, {
        uri: downloadURL,
        caption: caption || '',
        uploadedBy: userId,
        uploadedByName: userName,
        uploadedAt: serverTimestamp(),
        courtId: courtId,
        aiVerified: true,
        verificationResponse: verificationResponse,
        storagePath: permanentUrl ? undefined : `indivcourts/${courtId}/court_${courtId}_${userId}_${Date.now()}.jpg`,
      });

      const courtPhoto: CourtPhoto = {
        id: photoDoc.id,
        uri: downloadURL,
        caption: caption || '',
        uploadedBy: userId,
        uploadedByName: userName,
        uploadedAt: new Date(),
        courtId: courtId,
        aiVerified: true,
        verificationResponse: verificationResponse,
      };

      return courtPhoto;
    } catch (error) {
      console.error('Error uploading AI-verified court photo:', error);
      throw new Error(`Failed to upload AI-verified photo: ${error}`);
    }
  }

  /**
   * Load photos for a specific court
   */
  public async loadCourtPhotos(courtId: string, limitCount: number = 20): Promise<CourtPhoto[]> {
    try {
      const photosRef = collection(db, 'basketballCourts', courtId, 'photos');
      const q = query(photosRef, orderBy('uploadedAt', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      const photos: CourtPhoto[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        photos.push({
          id: doc.id,
          uri: data.uri,
          caption: data.caption || '',
          uploadedBy: data.uploadedBy,
          uploadedByName: data.uploadedByName || 'Anonymous User',
          uploadedAt: data.uploadedAt,
          courtId: data.courtId,
          aiVerified: data.aiVerified || false,
          verificationResponse: data.verificationResponse,
        });
      });

      return photos;
    } catch (error) {
      console.error('Error loading court photos:', error);
      throw new Error(`Failed to load court photos: ${error}`);
    }
  }

  /**
   * Get the total count of photos for a court
   */
  public async getPhotoCount(courtId: string): Promise<number> {
    try {
      const photosRef = collection(db, 'basketballCourts', courtId, 'photos');
      const querySnapshot = await getDocs(photosRef);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting photo count:', error);
      return 0;
    }
  }

  /**
   * Format the upload date for display
   */
  public formatUploadDate(uploadedAt: any): string {
    if (!uploadedAt) return 'Unknown date';

    try {
      // Handle Firestore timestamp
      const date = uploadedAt.toDate ? uploadedAt.toDate() : new Date(uploadedAt);
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
  }
}

export const courtPhotoService = CourtPhotoService.getInstance(); 