import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../services/FirebaseConfig';
import { userService } from '../utils/userService';

interface FollowContextType {
  followStatuses: Record<string, boolean>;
  isLoading: (userId: string) => boolean;
  followUser: (targetUserId: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string) => Promise<boolean>;
  isFollowing: (targetUserId: string) => boolean;
  updateFollowStatus: (targetUserId: string, isFollowing: boolean) => void;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

interface FollowProviderProps {
  children: ReactNode;
}

export function FollowProvider({ children }: FollowProviderProps) {
  const [followStatuses, setFollowStatuses] = useState<Record<string, boolean>>({});
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  const currentUserId = auth.currentUser?.uid;

  const isLoading = (userId: string): boolean => {
    return loadingUsers.has(userId);
  };

  const isFollowing = (targetUserId: string): boolean => {
    return followStatuses[targetUserId] || false;
  };

  const updateFollowStatus = (targetUserId: string, isFollowing: boolean) => {
    setFollowStatuses(prev => ({
      ...prev,
      [targetUserId]: isFollowing
    }));
  };

  const checkFollowStatus = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return;

    try {
      const following = await userService.isFollowing(currentUserId, targetUserId);
      updateFollowStatus(targetUserId, following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const followUser = async (targetUserId: string): Promise<boolean> => {
    if (!currentUserId || currentUserId === targetUserId) return false;

    // Check if already following to prevent unnecessary API calls
    if (followStatuses[targetUserId] === true) {
      console.log('User is already following this target');
      return true;
    }

    setLoadingUsers(prev => new Set(prev).add(targetUserId));

    try {
      const success = await userService.followUser(currentUserId, targetUserId);
      if (success) {
        updateFollowStatus(targetUserId, true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const unfollowUser = async (targetUserId: string): Promise<boolean> => {
    if (!currentUserId || currentUserId === targetUserId) return false;

    // Check if already not following to prevent unnecessary API calls
    if (followStatuses[targetUserId] === false) {
      console.log('User is already not following this target');
      return true;
    }

    setLoadingUsers(prev => new Set(prev).add(targetUserId));

    try {
      const success = await userService.unfollowUser(currentUserId, targetUserId);
      if (success) {
        updateFollowStatus(targetUserId, false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    } finally {
      setLoadingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  const value: FollowContextType = {
    followStatuses,
    isLoading,
    followUser,
    unfollowUser,
    isFollowing,
    updateFollowStatus
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const context = useContext(FollowContext);
  if (context === undefined) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
} 