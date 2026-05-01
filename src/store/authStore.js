import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false);

  // RUN ONCE: When the app first opens
  useEffect(() => {
    loadStorage();
  }, []);

  const loadStorage = async () => {
    try {
      console.log('--- 🛡️ BOOT CHECK: LOADING STORAGE ---');
      const token = await AsyncStorage.getItem('access_token');
      const savedIsNew = await AsyncStorage.getItem('is_new_user');
      const savedUserData = await AsyncStorage.getItem('user_data');

      if (token) {
        console.log('Token Found: YES');
        let needsOnboarding = false;
        if (savedIsNew !== null) {
          needsOnboarding = JSON.parse(savedIsNew);
        }

        setIsNew(needsOnboarding);
        setUser({
          token,                    // ← important
          ...JSON.parse(savedUserData || '{}'),
        });
      } else {
        console.log('Token Found: NO (User is logged out)');
      }
    } catch (e) {
      console.error('❌ Failed to load auth state from storage:', e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED & IMPROVED LOGIN FUNCTION
  const login = async (data) => {
    console.log('--- 🔍 DEBUG: RAW LOGIN DATA FROM SERVER ---', data);

    const token = data?.key;
    const userData = data?.user;

    if (!token) {
      console.error('❌ AuthStore: No token found. Check Django API response.');
      throw new Error('No token received from server');
    }

    const isAlreadyOnboarded = userData?.is_onboarded === true;
    const needsOnboarding = !isAlreadyOnboarded;

    console.log('--- 📊 DEBUG: ONBOARDING CALCULATION ---');
    console.log('is_onboarded from server:', userData?.is_onboarded);
    console.log('Resulting "needsOnboarding":', needsOnboarding);

    try {
      // Save to storage
      await AsyncStorage.setItem('access_token', token);
      await AsyncStorage.setItem('is_new_user', JSON.stringify(needsOnboarding));
      await AsyncStorage.setItem('user_data', JSON.stringify(userData || {}));

      // Update state
      setIsNew(needsOnboarding);
      setUser({ token, ...(userData || {}) });

      console.log('✅ Login Success. State + Storage updated.');
      
      return token; // ← return token so you can use it immediately if needed
    } catch (e) {
      console.error('❌ Login Persistence Error:', e);
      throw e;
    }
  };

  // ✅ NEW: Helper to get token anywhere (recommended for API clients)
  const getToken = async () => {
    if (user?.token) return user.token;
    return await AsyncStorage.getItem('access_token');
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'is_new_user',
        'user_data',
      ]);
      setUser(null);
      setIsNew(true);
      console.log('✅ User logged out.');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isNew,
        setIsNew,
        getToken,           // ← NEW: Use this in your API client
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};