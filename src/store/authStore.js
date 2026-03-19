import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNew, setIsNew] = useState(false); // Default to false to avoid onboarding loops

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

        // 1. Determine if user is new.
        // If the notebook is empty (null), we assume they are NOT new to avoid loops.
        let needsOnboarding = false;
        if (savedIsNew !== null) {
          needsOnboarding = JSON.parse(savedIsNew);
        }

        console.log('Stored is_new_user:', needsOnboarding);

        // 2. Set the global state
        setIsNew(needsOnboarding);
        setUser({
          token,
          ...JSON.parse(savedUserData || '{}'),
        });
      } else {
        console.log('Token Found: NO (User is logged out)');
      }
    } catch (e) {
      console.error('❌ Failed to load auth state from storage:', e);
    } finally {
      // 3. Stop the loading spinner
      setLoading(false);
    }
  };

  const login = async data => {
    console.log('--- 🔍 DEBUG: RAW LOGIN DATA FROM SERVER ---', data);

    const token = data?.key;
    const userData = data?.user;

    if (!token) {
      console.error('❌ AuthStore: No token found. Check Django API response.');
      return;
    }

    // ONBOARDING LOGIC:
    // If Django says 'is_onboarded' is true, then 'needsOnboarding' is false.
    const isAlreadyOnboarded = userData?.is_onboarded === true;
    const needsOnboarding = !isAlreadyOnboarded;

    console.log('--- 📊 DEBUG: ONBOARDING CALCULATION ---');
    console.log('is_onboarded from server:', userData?.is_onboarded);
    console.log('Resulting "needsOnboarding":', needsOnboarding);

    try {
      // Save everything to the phone's memory
      await AsyncStorage.setItem('access_token', token);
      await AsyncStorage.setItem(
        'is_new_user',
        JSON.stringify(needsOnboarding),
      );
      await AsyncStorage.setItem('user_data', JSON.stringify(userData || {}));

      // Update the app's brain immediately
      setIsNew(needsOnboarding);
      setUser({ token, ...(userData || {}) });

      console.log('✅ Login Success. State updated.');
    } catch (e) {
      console.error('❌ Login Persistence Error:', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'is_new_user',
        'user_data',
      ]);
      setUser(null);
      setIsNew(true); // Reset for the next person
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
        setIsNew, // Screens can call this to skip onboarding
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
