import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../services/FirebaseConfig';
import { userService } from '../utils/userService';

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    checkFollowStatus();
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async () => {
    if (!currentUserId || currentUserId === targetUserId) {
      setCheckingStatus(false);
      return;
    }

    try {
      setCheckingStatus(true);
      const following = await userService.isFollowing(currentUserId, targetUserId);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUserId || currentUserId === targetUserId || loading) return;

    try {
      setLoading(true);
      
      let success = false;
      if (isFollowing) {
        success = await userService.unfollowUser(currentUserId, targetUserId);
        if (success) {
          setIsFollowing(false);
          onFollowChange?.(false);
        } else {
          Alert.alert('Error', 'Failed to unfollow user. Please try again.');
        }
      } else {
        success = await userService.followUser(currentUserId, targetUserId);
        if (success) {
          setIsFollowing(true);
          onFollowChange?.(true);
        } else {
          Alert.alert('Error', 'Failed to follow user. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile or if not logged in
  if (!currentUserId || currentUserId === targetUserId) {
    return null;
  }

  // Show loading spinner while checking initial status
  if (checkingStatus) {
    return (
      <TouchableOpacity style={[styles.button, styles[size], styles.loadingButton, style]} disabled>
        <ActivityIndicator size="small" color="#999" />
      </TouchableOpacity>
    );
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