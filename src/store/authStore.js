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
  console.log('--- 🔍 DEBUG: RAW LOGIN DATA FROM SERVER ---', data);

  // === Extract data from different possible API responses ===
  let access = data?.access;
  let refresh = data?.refresh;
  let token = data?.key;                    // Django-style token
  let userData = data?.user || data?.user_data;
  
  // Onboarding logic (Django-specific)
  const isAlreadyOnboarded = userData?.is_onboarded === true;
  const needsOnboarding = !isAlreadyOnboarded;

  console.log('--- 📊 DEBUG: ONBOARDING CALCULATION ---');
  console.log('is_onboarded from server:', userData?.is_onboarded);
  console.log('Resulting "needsOnboarding":', needsOnboarding);

  // === Google / fallback case ===
  // If normal tokens are missing, try to read from storage (Google flow)
  if (!access || !refresh) {
    if (!token) {
      access = await AsyncStorage.getItem('access');
      refresh = await AsyncStorage.getItem('refresh');
      const savedUser = await AsyncStorage.getItem('user');
      
      if (savedUser && !userData) {
        userData = JSON.parse(savedUser);
      }
    }
  }

  // Use Django key as access token if that's what we got
  if (token && !access) {
    access = token;
  }

  // Final validation
  if (!access || !userData) {
    console.error('❌ AuthStore: Missing critical auth data. Received:', {
      hasAccess: !!access,
      hasRefresh: !!refresh,
      hasToken: !!token,
      hasUser: !!userData,
    });
    throw new Error('Incomplete auth data received from server');
  }

  try {
    // === Save to AsyncStorage ===
    const storageItems = [
      ['access', access],
      ['access_token', access],           // keep both for backward compatibility
    ];

    if (refresh) {
      storageItems.push(['refresh', refresh]);
    }

    storageItems.push([
      'is_new_user',
      JSON.stringify(needsOnboarding),
    ]);

    storageItems.push(['user', JSON.stringify(userData)]);
    storageItems.push(['user_data', JSON.stringify(userData)]); // backward compat

    await AsyncStorage.multiSet(storageItems);

    // === Update Zustand / Store state ===
    setToken?.(access);                    // if you have this setter
    setRefreshToken?.(refresh);            // if you have this setter
    setIsNewUser?.(needsOnboarding);       // newer naming
    setIsAuthenticated?.(true);

    setUser({
      token: access,
      ...(userData || {}),
    });

    console.log('✅ Login Success. State & storage updated.');
    console.log('User is new/onboarding needed:', needsOnboarding);

  } catch (e) {
    console.error('❌ Login Persistence Error:', e);
    throw e;
  }
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