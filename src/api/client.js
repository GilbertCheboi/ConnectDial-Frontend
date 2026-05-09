/**
 * src/api/client.js
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';

export const BASE_URL = 'https://api.connectdial.com/';

// ✅ Navigation ref usable outside React components
export const navigationRef = createNavigationContainerRef();

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor - Attach DRF Token
client.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Guard against multiple simultaneous 401 redirects
let isHandling401 = false;

// Response Interceptor - Handle 401 (logout on auth failure)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;

      await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
      console.log('❌ 401 Unauthorized - Token cleared, redirecting to Login');

      // ✅ Redirect to login screen
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Login' }], // 👈 match your actual screen name
        });
      }

      // Reset flag after a short delay so future logouts still work
      setTimeout(() => { isHandling401 = false; }, 3000);
    }
    return Promise.reject(error);
  }
);

export default client;