import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key constants — prevents typo bugs across the app
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  IS_NEW_USER: 'is_new_user',
  USER_DATA: 'user_data',
};

export const AuthContext = createContext();

// Proper useAuth hook with guard (like V1)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);
  const [refreshToken, setRefreshToken] = useState(null);

  // Derived — no need for a separate isAuthenticated state
  const isAuthenticated = !!user?.token;

  useEffect(() => {
    loadStorage();
  }, []);

  const loadStorage = async () => {
    try {
      const [token, storedRefresh, savedIsNew, savedUserData] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.IS_NEW_USER,
        STORAGE_KEYS.USER_DATA,
      ]);

      const accessToken = token[1];
      const refreshTokenValue = storedRefresh[1];
      const isNewValue = savedIsNew[1];
      const userDataValue = savedUserData[1];

      if (accessToken) {
        const needsOnboarding = isNewValue !== null ? JSON.parse(isNewValue) : false;
        setIsNew(needsOnboarding);
        setRefreshToken(refreshTokenValue);
        setUser({
          token: accessToken,
          ...JSON.parse(userDataValue || '{}'),
        });
      }
    } catch (e) {
      console.error('❌ Failed to load auth state from storage:', e);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (data) => {
    const token = data?.token || data?.key || data?.access;
    const refresh = data?.refresh || data?.refreshToken || null;
    const userData = data?.user;

    // Throw instead of silently returning — lets the caller handle the error
    if (!token) {
      throw new Error('Login failed: No access token in server response');
    }

    const needsOnboarding = userData?.is_onboarded !== true;

    try {
      const storageEntries = [
        [STORAGE_KEYS.ACCESS_TOKEN, token],
        [STORAGE_KEYS.IS_NEW_USER, JSON.stringify(needsOnboarding)],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData || {})],
      ];

      // Only persist refresh token if one was provided
      if (refresh) {
        storageEntries.push([STORAGE_KEYS.REFRESH_TOKEN, refresh]);
      }

      await AsyncStorage.multiSet(storageEntries);

      setIsNew(needsOnboarding);
      setRefreshToken(refresh);
      setUser({ token, ...(userData || {}) });
    } catch (e) {
      // Re-throw so calling screen can show an error to the user
      throw new Error(`Login persistence failed: ${e.message}`);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      setUser(null);
      setRefreshToken(null);
      setIsNew(false); // false, not true — they're not a new user on next login
    } catch (e) {
      console.error('❌ Logout error:', e);
      throw new Error('Logout failed. Please try again.');
    }
  }, []);

  // Lets a screen update user fields (e.g. after profile edit) without full re-login
  const updateUser = useCallback(async (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    const { token, ...userData } = updatedUser;
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isNew,
        isAuthenticated,
        refreshToken,
        setIsNew,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};