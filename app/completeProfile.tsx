import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  View
} from 'react-native';
import { router } from 'expo-router';
import { auth } from '@/services/FirebaseConfig';
import { userService } from '@/utils/userService';

export default function CompleteProfileScreen() {
  const [formData, setFormData] = useState({
    username: '',
    country: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      Alert.alert('Error', 'Username is required');
      return false;
    }
    if (!formData.country.trim()) {
      Alert.alert('Error', 'Country is required');
      return false;
    }
    return true;
  };

  const completeProfile = async () => {
    if (!validateForm()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'No user found. Please sign in again.');
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      // Create user profile in Firestore
      await userService.createUserProfile(user.uid, {
        username: formData.username,
        email: user.email || '',
        country: formData.country,
        phoneNumber: formData.phoneNumber || undefined,
        profileImageUrl: user.photoURL || undefined
      });

      console.log('Profile completed successfully');
      Alert.alert('Success', 'Profile completed successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
      
    } catch (error: any) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayEmail = auth.currentUser?.email || 'Not available';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Please provide additional information to complete your profile
        </Text>

        {/* Display account info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            ✅ Email: {displayEmail}
          </Text>
          <Text style={styles.infoSubtext}>
            (Already verified)
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#888"
          value={formData.username}
          onChangeText={(value) => updateFormData('username', value)}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Country"
          placeholderTextColor="#888"
          value={formData.country}
          onChangeText={(value) => updateFormData('country', value)}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number (Optional)"
          placeholderTextColor="#888"
          value={formData.phoneNumber}
          onChangeText={(value) => updateFormData('phoneNumber', value)}
          keyboardType="phone-pad"
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={completeProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Completing Profile...' : 'Complete Profile'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    alignSelf: 'center',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#388E3C',
    marginTop: 2,
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
}); 