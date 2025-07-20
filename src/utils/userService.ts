import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../services/FirebaseConfig';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  country: string;
  phoneNumber?: string | null;
  profileImageUrl?: string;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export const userService = {
  async createUserProfile(uid: string, profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'points'>) {
    const timestamp = new Date().toISOString();
    const userProfile: UserProfile = {
      uid,
      ...profileData,
      points: 0, // Initialize with 0 points
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, 'users', uid), userProfile);
    return userProfile;
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  },

  async updateUserProfile(uid: string, updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>) {
    const timestamp = new Date().toISOString();
    const updateData = {
      ...updates,
      updatedAt: timestamp
    };

    await updateDoc(doc(db, 'users', uid), updateData);
    return updateData;
  },

  async awardPoints(uid: string, pointsToAdd: number) {
    try {
      const timestamp = new Date().toISOString();
      
      // First check if user profile exists
      const userProfile = await this.getUserProfile(uid);
      
      if (!userProfile) {
        // If user profile doesn't exist, create it with initial points
        console.log('User profile not found, creating new profile with points');
        await this.createUserProfile(uid, {
          username: 'User', // Default username
          email: '', // Will be updated later
          country: '', // Will be updated later
        });
        
        // Now update with the awarded points
        await updateDoc(doc(db, 'users', uid), {
          points: pointsToAdd,
          updatedAt: timestamp
        });
        return true;
      }
      
      // If user profile exists, update points
      await updateDoc(doc(db, 'users', uid), {
        points: increment(pointsToAdd),
        updatedAt: timestamp
      });
      return true;
    } catch (error) {
      console.error('Error awarding points:', error);
      return false;
    }
  },

  async awardPointsForReport(uid: string) {
    return this.awardPoints(uid, 20);
  },

  async awardPointsForVerification(uid: string) {
    return this.awardPoints(uid, 15);
  },

  async awardPointsForGameCreation(uid: string) {
    return this.awardPoints(uid, 10);
  },

  async awardPointsForGameJoining(uid: string) {
    return this.awardPoints(uid, 5);
  },

  async deductPointsForGameLeaving(uid: string) {
    return this.awardPoints(uid, -5);
  },

  async migrateUserPoints(uid: string) {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (userProfile && userProfile.points === undefined) {
        // Add points field to existing users
        await this.updateUserProfile(uid, {
          points: 0
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error migrating user points:', error);
      return false;
    }
  },

  async ensureUserProfileExists(uid: string, userEmail?: string) {
    try {
      const userProfile = await this.getUserProfile(uid);
      
      if (!userProfile) {
        // Create a basic user profile if it doesn't exist
        await this.createUserProfile(uid, {
          username: 'User',
          email: userEmail || '',
          country: '',
        });
        console.log('Created basic user profile for:', uid);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
      return false;
    }
  }
};
