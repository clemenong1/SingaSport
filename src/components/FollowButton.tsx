import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../services/FirebaseConfig';
import { userService } from '../utils/userService';
import { useFollow } from '../contexts';

interface FollowButtonProps {
  targetUserId: string;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ 
  targetUserId, 
  size = 'medium', 
  style, 
  onFollowChange 
}: FollowButtonProps) {
  const { 
    followUser, 
    unfollowUser, 
    isFollowing: isFollowingUser, 
    isLoading, 
    updateFollowStatus 
  } = useFollow();

  const currentUserId = auth.currentUser?.uid;
  const isFollowing = isFollowingUser(targetUserId);
  const loading = isLoading(targetUserId);

  useEffect(() => {
    checkInitialFollowStatus();
  }, [targetUserId, currentUserId]);

  const checkInitialFollowStatus = async () => {
    if (!currentUserId || currentUserId === targetUserId) {
      return;
    }

    try {
      const following = await userService.isFollowing(currentUserId, targetUserId);
      updateFollowStatus(targetUserId, following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || currentUserId === targetUserId || loading) return;

    try {
      let success = false;
      if (isFollowing) {
        success = await unfollowUser(targetUserId);
        if (success) {
          onFollowChange?.(false);
        } else {
          Alert.alert('Error', 'Failed to unfollow user. Please try again.');
        }
      } else {
        success = await followUser(targetUserId);
        if (success) {
          onFollowChange?.(true);
        } else {
          Alert.alert('Error', 'Failed to follow user. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  // Don't show button for own profile or if not logged in
  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[size],
        isFollowing ? styles.followingButton : styles.followButton,
        loading && styles.loadingButton,
        style,
      ]}
      onPress={handleFollowToggle}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={isFollowing ? "#666" : "#fff"} 
        />
      ) : (
        <Text style={[
          styles.buttonText,
          isFollowing ? styles.followingText : styles.followText,
          styles[`${size}Text`]
        ]}>
          {isFollowing ? 'Followed' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
  },
  
  // Size variants
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    borderRadius: 15,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    borderRadius: 20,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
    borderRadius: 25,
  },
  
  // Button states
  followButton: {
    backgroundColor: '#d32f2f',
    borderWidth: 0,
  },
  followingButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  loadingButton: {
    opacity: 0.7,
  },
  
  // Text styles
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: '#666',
  },
  
  // Size-specific text
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
}); 