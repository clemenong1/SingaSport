import { StyleSheet, TouchableOpacity, View, Text, ScrollView, Image, Alert } from 'react-native';
import { auth } from '@/services/FirebaseConfig';
import { signOut } from 'firebase/auth';
import { router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { userService, UserProfile } from '@/utils/userService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Refresh profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      if (auth.currentUser) {
        const profile = await userService.getUserProfile(auth.currentUser.uid);
        setUserProfile(profile);
        
        // Load profile image if it exists
        if (profile?.profileImageUrl) {
          setProfileImage(profile.profileImageUrl);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        // TODO: Upload to Firebase Storage and update profile
        console.log('Selected image:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleEditProfile = () => {
    router.push('/editProfile');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('Signed out successfully');
              router.replace('/');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Picture Section */}
      <View style={styles.profilePictureContainer}>
        <TouchableOpacity onPress={handleImagePicker} style={styles.profilePictureWrapper}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profilePicture} />
          ) : (
            <View style={styles.defaultProfilePicture}>
              <Ionicons name="person" size={50} color="#ccc" />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{userProfile?.username || 'User'}</Text>
        <Text style={styles.userEmail}>{userProfile?.email || 'No email'}</Text>
      </View>

      {/* Profile Information Section */}
      <View style={styles.infoSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color="#0066cc" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{userProfile?.username || 'Not set'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userProfile?.email || 'Not set'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Country</Text>
            <Text style={styles.infoValue}>{userProfile?.country || 'Not set'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{userProfile?.phoneNumber || 'Not set'}</Text>
          </View>
        </View>
      </View>

      {/* Sign Out Button */}
      <View style={styles.signOutSection}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  profilePictureContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  profilePictureWrapper: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#0066cc',
  },
  defaultProfilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ddd',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#0066cc',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  editButtonText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  signOutSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});