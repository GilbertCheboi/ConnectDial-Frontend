/**
 * src/api/client.js
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://api.connectdial.com/'

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

// Response Interceptor - Handle 401 (logout on auth failure)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth token and user data on 401
      await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
      console.log('❌ 401 Unauthorized - Token cleared');
    }
    return Promise.reject(error);
  }
);

export default client;
