import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.100.107:8000/',
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    // IMPORTANT: Use "Token", not "Bearer" for DRF Key Authentication
    config.headers.Authorization = `Token ${token}`;
    console.log('API Request Header:', config.headers.Authorization);
  }
  return config;
});

export default api;
