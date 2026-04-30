// src/api/auth.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const API_BASE = 'http://192.168.139.30:8000/auth/social';   // or use your BASE_URL

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut();

    const userInfo = await GoogleSignin.signIn();

    let idToken = null;
    if (userInfo?.type === 'success') {
      idToken = userInfo.data?.idToken;
    } else {
      throw new Error('Google sign-in was cancelled or failed');
    }

    if (!idToken) throw new Error('Google sign-in did not return an ID token.');

    const { data } = await axios.post(`${API_BASE}/google/`, { id_token: idToken });

    console.log('✅ FULL BACKEND RESPONSE:', JSON.stringify(data));

    // still persist to AsyncStorage
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    await AsyncStorage.setItem('access_token', data.access);
    await AsyncStorage.setItem('refresh_token', data.refresh);

    // ✅ FIX: return tokens so authStore can update its in-memory state
    return {
      user: data.user,
      access: data.access,
      refresh: data.refresh,
      isNewUser: data.is_new_user ?? false,
    };
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};