/**
 * src/api/client.js
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://10.199.198.22:8000/';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor - Attach Access Token
client.interceptors.request.use(
  async (config) => {
    const access = await AsyncStorage.getItem('access');
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh Token Logic
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
};

// Response Interceptor - Handle 401 + Silent Refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh on 401 and if not already retrying
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = await AsyncStorage.getItem('refresh');

        if (!refresh) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${BASE_URL}auth/token/refresh/`, { refresh });

        await AsyncStorage.setItem('access', data.access);
        if (data.refresh) {
          await AsyncStorage.setItem('refresh', data.refresh);
        }

        processQueue(null, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;

        return client(original);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);

        processQueue(refreshError);
        await AsyncStorage.multiRemove(['access', 'refresh', 'user']);

        // Optional: You can dispatch a logout action here if using Context/Redux
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;