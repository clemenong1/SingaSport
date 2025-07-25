import { doc, getDoc, setDoc, updateDoc, increment, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../services/FirebaseConfig';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  country: string;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
  points: number;
  createdAt: string;
  updatedAt: string;
  // Follow system fields
  following: string[];
  followers: string[];
  followingCount: number;
  followersCount: number;
}

export const userService = {
  async createUserProfile(uid: string, profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt' | 'points' | 'following' | 'followers' | 'followingCount' | 'followersCount'>) {
    const timestamp = new Date().toISOString();
    
    // Handle optional fields properly - convert undefined to null for Firebase compatibility
    const cleanedProfileData = {
      ...profileData,
      phoneNumber: profileData.phoneNumber === undefined ? null : profileData.phoneNumber,
      profileImageUrl: profileData.profileImageUrl === undefined ? null : profileData.profileImageUrl
    };
    
    const userProfile: UserProfile = {
      uid,
      ...cleanedProfileData,
      points: 0, // Initialize with 0 points
      following: [], // Initialize empty following array
      followers: [], // Initialize empty followers array
      followingCount: 0, // Initialize with 0 following count
      followersCount: 0, // Initialize with 0 followers count
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

  async awardBonusPointsForAIVerification(uid: string, bonusPoints: number = 5) {
    return this.awardPoints(uid, bonusPoints);
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

  // Follow System Functions
  async followUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      // Prevent self-following
      if (currentUserId === targetUserId) {
        throw new Error("You cannot follow yourself");
      }

      // Check if already following
      const isAlreadyFollowing = await this.isFollowing(currentUserId, targetUserId);
      if (isAlreadyFollowing) {
        throw new Error("You are already following this user");
      }

      // Use batch for atomic operation
      const batch = writeBatch(db);
      
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);
      
      // Update current user's following list and count
      batch.update(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1),
        updatedAt: new Date().toISOString()
      });
      
      // Update target user's followers list and count
      batch.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
        followersCount: increment(1),
        updatedAt: new Date().toISOString()
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  },

  async unfollowUser(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      // Prevent self-unfollowing
      if (currentUserId === targetUserId) {
        throw new Error("You cannot unfollow yourself");
      }

      // Check if actually following
      const isFollowing = await this.isFollowing(currentUserId, targetUserId);
      if (!isFollowing) {
        throw new Error("You are not following this user");
      }

      // Use batch for atomic operation
      const batch = writeBatch(db);
      
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);
      
      // Update current user's following list and count
      batch.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: increment(-1),
        updatedAt: new Date().toISOString()
      });
      
      // Update target user's followers list and count
      batch.update(targetUserRef, {
        followers: arrayRemove(currentUserId),
        followersCount: increment(-1),
        updatedAt: new Date().toISOString()
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  },

  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const currentUserProfile = await this.getUserProfile(currentUserId);
      if (!currentUserProfile) return false;
      
      return currentUserProfile.following?.includes(targetUserId) || false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },

  async getFollowers(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || !userProfile.followers) return [];

      const followersProfiles: UserProfile[] = [];
      
      // Fetch follower profiles in batches
      for (const followerId of userProfile.followers) {
        const followerProfile = await this.getUserProfile(followerId);
        if (followerProfile) {
          followersProfiles.push(followerProfile);
        }
      }
      
      return followersProfiles;
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  },

  async getFollowing(userId: string): Promise<UserProfile[]> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || !userProfile.following) return [];

      const followingProfiles: UserProfile[] = [];
      
      // Fetch following profiles in batches
      for (const followingId of userProfile.following) {
        const followingProfile = await this.getUserProfile(followingId);
        if (followingProfile) {
          followingProfiles.push(followingProfile);
        }
      }
      
      return followingProfiles;
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  },

  async getUsernameByUid(uid: string): Promise<string | null> {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.username || null;
    } catch (error) {
      console.error('Error getting username:', error);
      return null;
    }
  },

  // Migration function for existing users to add follow fields
  async migrateUserForFollowSystem(uid: string) {
    try {
      const userProfile = await this.getUserProfile(uid);
      if (userProfile && userProfile.following === undefined) {
        // Add follow fields to existing users
        await this.updateUserProfile(uid, {
          following: [],
          followers: [],
          followingCount: 0,
          followersCount: 0
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error migrating user for follow system:', error);
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
