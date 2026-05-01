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

// ── Attach access token to every outgoing request ────────────────────────────
client.interceptors.request.use(
  async (config) => {
    const access = await AsyncStorage.getItem('access_token');  // ← Fixed key
    if (access) {
      config.headers.Authorization = `Token ${access}`;         // ← Changed to Token (Django)
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Silent refresh on 401 ────────────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) =>
          refreshQueue.push({ resolve, reject }),
        ).then((token) => {
          original.headers.Authorization = `Token ${token}`;   // ← Also updated here
          return client(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = await AsyncStorage.getItem('refresh');
        if (!refresh) throw new Error('No refresh token stored');

        const { data } = await axios.post(
          `${BASE_URL}auth/token/refresh/`,
          { refresh },
        );

        await AsyncStorage.setItem('access_token', data.access);   // ← Fixed key
        if (data.refresh) await AsyncStorage.setItem('refresh', data.refresh);

        processQueue(null, data.access);
        original.headers.Authorization = `Token ${data.access}`;   // ← Fixed
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(['access_token', 'refresh', 'user']); // ← Fixed key
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default client;