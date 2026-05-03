/**
 * src/services/auth.js
 * Google Sign-In Service + Re-exports
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

// Re-export all functions from auth.js for easy import
export * from '../api/auth';