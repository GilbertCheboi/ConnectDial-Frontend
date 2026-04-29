// src/api/auth.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const API_BASE = 'http://192.168.139.30:8000/auth/social';   // or use your BASE_URL

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    const idToken = userInfo.idToken;
    console.log('Google ID Token:', idToken?.substring(0, 50) + '...');

    // Better: Use id_token instead of access_token
    const response = await axios.post(`${API_BASE}/google/`, {
      id_token: idToken,           // ← Most common & recommended
      // access_token: idToken,    // Try this only if id_token fails
    });

    console.log('✅ Full Backend Response:', JSON.stringify(response.data, null, 2));

    const { access, refresh, user, is_new_user } = response.data;

    if (!access) {
      throw new Error("No access token in server response");
    }

    // Store tokens
    await AsyncStorage.setItem('access', access);
    if (refresh) await AsyncStorage.setItem('refresh', refresh);

    // Return the FULL object that your auth store expects
    return response.data;        // ← THIS WAS THE MAIN BUG

  } catch (error) {
    console.error('Google login error:', error.response?.data || error.message);
    throw error;
  }
};