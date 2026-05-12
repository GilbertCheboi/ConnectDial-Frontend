/**
 * src/services/auth.js
 * Google Sign-In Service + Re-exports
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '597689072930-lf6o7j50lqv8ro2qc4lluq06gribo16h.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

// Re-export all functions from auth.js for easy import
export * from '../api/auth';