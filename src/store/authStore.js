// src/store/authStore.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load session on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const access = await AsyncStorage.getItem('access');
        const refresh = await AsyncStorage.getItem('refresh');
        const userStr = await AsyncStorage.getItem('user');

        if (access && refresh && userStr) {
          setToken(access);
          setRefreshToken(refresh);
          setUser(JSON.parse(userStr));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to load auth from storage', e);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
  }, []);

  const login = async (data) => {
    console.log("🔐 AuthStore login received:", data);

    let access = data?.access;
    let refresh = data?.refresh;
    let userData = data?.user;
    let newUserFlag = data?.isNewUser ?? data?.is_new_user ?? false;

    // ✅ Google case: tokens already saved in saveSession(), read them back
    // Normal login and 2FA now pass access+refresh+user directly, so this
    // fallback only triggers for the Google flow
    if (!access || !refresh) {
      access = await AsyncStorage.getItem('access');
      refresh = await AsyncStorage.getItem('refresh');
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser && !userData) userData = JSON.parse(savedUser);
    }

    if (!access || !refresh || !userData) {
      console.error("❌ Missing auth data. Received:", data);
      throw new Error("Incomplete auth data received");
    }

    await AsyncStorage.multiSet([
      ['access', access],
      ['refresh', refresh],
      ['user', JSON.stringify(userData)],
    ]);

    setToken(access);
    setRefreshToken(refresh);
    setUser(userData);
    setIsAuthenticated(true);
    setIsNewUser(newUserFlag);

    console.log("✅ AuthStore: Login successful");
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['access', 'refresh', 'user']);
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsNewUser(false);
  };

  const value = {
    token,
    refreshToken,
    user,
    isAuthenticated,
    isNewUser,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};