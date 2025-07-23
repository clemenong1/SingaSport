import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './FirebaseConfig';
import { TempImageData } from '../types';

class TempStorageService {
  private static instance: TempStorageService;
  private readonly TEMP_PREFIX = 'temp/';
  private readonly PERMANENT_PREFIX = 'verified/';
  private readonly CLEANUP_DELAY = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  public static getInstance(): TempStorageService {
    if (!TempStorageService.instance) {
      TempStorageService.instance = new TempStorageService();
    }
    return TempStorageService.instance;
  }

  /**
   * Upload image to temporary storage for AI verification
   */
  public async uploadToTemp(
    imageUri: string,
    type: 'report' | 'verification',
    contextId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      console.log('Uploading to temp storage:', { imageUri, type, contextId, userId });
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('Image blob size:', blob.size);

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${type}_${contextId}_${userId}_${timestamp}.jpg`;
      const tempPath = `${this.TEMP_PREFIX}${type}/${fileName}`;
      console.log('Temp path:', tempPath);

      // Create storage reference
      const storageRef = ref(storage, tempPath);

      // Upload with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Temp upload progress:', progress + '%');
            onProgress?.(progress);
          },
          (error) => {
            console.error('Temp upload error:', error);
            reject(new Error(`Failed to upload to temporary storage: ${error.message}`));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Temp upload successful:', downloadURL);
              
              // Schedule cleanup
              this.scheduleCleanup(tempPath);
              
              resolve(downloadURL);
            } catch (error) {
              console.error('Error getting temp download URL:', error);
              reject(new Error(`Failed to get download URL: ${error}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in uploadToTemp:', error);
      throw new Error(`Failed to process image for upload: ${error}`);
    }
  }

  /**
   * Move verified image from temp to permanent storage
   */
  public async moveToPermStorage(
    tempUrl: string,
    type: 'report' | 'verification',
    contextId: string,
    userId: string
  ): Promise<string> {
    try {
      console.log('Moving to permanent storage:', { tempUrl, type, contextId, userId });
      
      // Extract filename from temp URL
      const tempPath = this.extractPathFromUrl(tempUrl);
      if (!tempPath) {
        console.error('Failed to extract path from URL:', tempUrl);
        throw new Error(`Invalid temporary URL: ${tempUrl}`);
      }

      console.log('Extracted temp path:', tempPath);

      // Download the file from temp storage
      const tempRef = ref(storage, tempPath);
      let downloadUrl: string;
      
      try {
        downloadUrl = await getDownloadURL(tempRef);
        console.log('Got download URL:', downloadUrl);
      } catch (getUrlError) {
        console.error('Error getting download URL:', getUrlError);
        // If we can't get download URL, maybe the tempUrl is already a download URL
        downloadUrl = tempUrl;
      }
      
      // Fetch the image data
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      console.log('Fetched blob size:', blob.size);

      // Generate permanent path
      const filename = tempPath.split('/').pop() || `${Date.now()}.jpg`;
      const permanentPath = `${this.PERMANENT_PREFIX}${type}/${contextId}/${filename}`;
      console.log('Permanent path:', permanentPath);

      // Upload to permanent location
      const permanentRef = ref(storage, permanentPath);
      const uploadTask = uploadBytesResumable(permanentRef, blob);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress + '%');
          },
          (error) => {
            console.error('Permanent upload error:', error);
            reject(new Error(`Failed to move to permanent storage: ${error.message}`));
          },
          async () => {
            try {
              const permanentUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Successfully moved to permanent storage:', permanentUrl);
              
              // Clean up temp file
              await this.deleteTemp(tempPath);
              
              resolve(permanentUrl);
            } catch (error) {
              console.error('Error getting permanent URL:', error);
              reject(new Error(`Failed to get permanent URL: ${error}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Error in moveToPermStorage:', error);
      throw new Error(`Failed to move image to permanent storage: ${error}`);
    }
  }

  /**
   * Delete temporary image
   */
  public async deleteTemp(pathOrUrl: string): Promise<void> {
    try {
      const path = pathOrUrl.includes('http') ? this.extractPathFromUrl(pathOrUrl) : pathOrUrl;
      if (!path) {
        console.warn('Could not extract path for deletion:', pathOrUrl);
        return;
      }

      const tempRef = ref(storage, path);
      await deleteObject(tempRef);
    } catch (error) {
      // Log but don't throw - temp file cleanup is not critical
      console.warn('Failed to delete temp file:', error);
    }
  }

  /**
   * Extract storage path from Firebase URL
   */
  private extractPathFromUrl(url: string): string | null {
    try {
      console.log('Extracting path from URL:', url);
      
      const urlObj = new URL(url);
      
      // Handle different Firebase Storage URL formats:
      // Format 1: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Ffile.jpg?alt=media&token=...
      // Format 2: https://storage.googleapis.com/bucket/path/file.jpg
      
      if (urlObj.hostname === 'firebasestorage.googleapis.com') {
        // Standard Firebase Storage URL format
        const pathMatch = urlObj.pathname.match(/\/o\/(.*?)(?:\?|$)/);
        if (pathMatch && pathMatch[1]) {
          const decodedPath = decodeURIComponent(pathMatch[1]);
          console.log('Extracted path (Firebase format):', decodedPath);
          return decodedPath;
        }
      } else if (urlObj.hostname === 'storage.googleapis.com') {
        // Alternative Google Storage URL format
        const pathMatch = urlObj.pathname.match(/^\/[^\/]+\/(.*)/);
        if (pathMatch && pathMatch[1]) {
          console.log('Extracted path (GCS format):', pathMatch[1]);
          return pathMatch[1];
        }
      }
      
      // Fallback: try to extract from any URL with file extension
      const fallbackMatch = url.match(/([^\/]+\/[^?]+\.(jpg|jpeg|png|gif|webp))/i);
      if (fallbackMatch && fallbackMatch[1]) {
        console.log('Extracted path (fallback):', fallbackMatch[1]);
        return fallbackMatch[1];
      }
      
      console.warn('Could not extract path from URL:', url);
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  }

  /**
   * Schedule automatic cleanup of temp file
   */
  private scheduleCleanup(tempPath: string): void {
    setTimeout(async () => {
      try {
        await this.deleteTemp(tempPath);
      } catch (error) {
        console.warn('Scheduled cleanup failed for:', tempPath, error);
      }
    }, this.CLEANUP_DELAY);
  }

  /**
   * Clean up all temporary files older than specified minutes
   */
  public async cleanupOldTempFiles(olderThanMinutes: number = 30): Promise<void> {
    // This would require listing all files in temp directory
    // For now, we rely on scheduled cleanup
    console.log(`Cleanup requested for files older than ${olderThanMinutes} minutes`);
  }

  /**
   * Compress image before upload for cost optimization
   */
  public async compressImage(imageUri: string, quality: number = 0.8): Promise<string> {
    // For React Native, we would use expo-image-manipulator or similar
    // For now, return original URI - compression can be added later
    return imageUri;
  }

  /**
   * Get storage statistics
   */
  public getStorageStats(): { tempUploads: number; permanentMoves: number } {
    // In a production app, you might track these metrics
    return {
      tempUploads: 0,
      permanentMoves: 0
    };
  }
}

export const tempStorageService = TempStorageService.getInstance(); 