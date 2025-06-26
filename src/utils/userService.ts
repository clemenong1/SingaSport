import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/FirebaseConfig';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  country: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export const userService = {
  // Create user profile in Firestore
  async createUserProfile(uid: string, profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) {
    const timestamp = new Date().toISOString();
    const userProfile: UserProfile = {
      uid,
      ...profileData,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'users', uid), userProfile);
    return userProfile;
  },

  // Get user profile from Firestore
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        console.log('No user profile found');
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>) {
    const timestamp = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: timestamp
    };

    await updateDoc(doc(db, 'users', uid), updateData);
    return updateData;
  }
}; 