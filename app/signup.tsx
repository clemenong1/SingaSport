import { auth } from '../src/services/FirebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { userService } from '../src/utils/userService';
import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  View,
  ScrollView,
  Alert
} from 'react-native';
import { router } from 'expo-router';

export default function SignUpScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!formData.country.trim()) {
      Alert.alert('Error', 'Country is required');
      return false;
    }
    return true;
  };

  const signUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.username
      });

      // Prepare profile data with proper null handling for optional fields
      const profileData: any = {
        username: formData.username,
        email: formData.email,
        country: formData.country,
      };

      // Only include phone number if it's not empty
      if (formData.phoneNumber && formData.phoneNumber.trim()) {
        profileData.phoneNumber = formData.phoneNumber.trim();
      }

      await userService.createUserProfile(user.uid, profileData);

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/main') }
      ]);

    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Only show user-friendly errors for email and password issues
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>Join SingaSport today!</Text>

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
          placeholder="Email"
          placeholderTextColor="#888"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={formData.password}
          onChangeText={(value) => updateFormData('password', value)}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#888"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData('confirmPassword', value)}
          secureTextEntry
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
          onPress={signUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

              <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('../auth/login')}
      >
        <Text style={styles.linkText}>Already have an account? Log In</Text>
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
    paddingVertical: 40,
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
    marginBottom: 15,
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
  linkButton: {
    paddingVertical: 10,
  },
  linkText: {
    color: '#0066cc',
    fontSize: 16,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});