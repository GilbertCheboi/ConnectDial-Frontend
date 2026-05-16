/**
 * AppNavigator.js - FIXED (NO NavigationContainer HERE)
 */

import React, { useContext, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import api from '../api/client';

// Contexts
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { NotificationProvider, useNotifications } from '../store/NotificationContext';
import { FollowProvider } from '../store/FollowContext';
import { ToastProvider } from '../store/ToastContext';

// Navigators
import AuthNavigator from '../api/AuthNavigator';
import OnboardingNavigator from '../api/OnboardingNavigator';
import MainStackNavigator from './MainStackNavigator';

// UI
import { ToastContainer } from '../components/ToastContainer';

// ─────────────────────────────────────────────────────────────
// INNER NAV CONTENT (NO NavigationContainer HERE)
// ─────────────────────────────────────────────────────────────
function AppNavigatorContent() {
  const { user, loading, isNew } = useContext(AuthContext);
  const themeContext = useContext(ThemeContext) || {};
  const { setupPushNotifications } = useNotifications();

  const themeLoading = themeContext.loading || false;
  const fcmSetupDone = useRef(false);

  // ─────────────────────────────────────────────
  // Save FCM token
  // ─────────────────────────────────────────────
  const saveTokenToBackend = async (fcmToken) => {
    if (!user?.token) return;

    try {
      await api.patch('auth/update/', { fcm_token: fcmToken });
    } catch (error) {
      console.error('FCM sync error:', error?.response?.data || error.message);
    }
  };

  // ─────────────────────────────────────────────
  // FCM setup
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token || fcmSetupDone.current) return;

    const init = async () => {
      try {
        const msg = messaging();

        const authStatus = await msg.requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) return;

        const token = await msg.getToken();
        if (token) await saveTokenToBackend(token);

        fcmSetupDone.current = true;
      } catch (e) {
        console.error('FCM init error', e);
      }
    };

    init();
  }, [user?.token]);

  // token refresh
  useEffect(() => {
    if (!user?.token) return;
    const msg = messaging();
    return msg.onTokenRefresh(saveTokenToBackend);
  }, [user?.token]);

  // loading screen
  if (loading || themeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <>
      {/* 👇 NO NavigationContainer here */}
      {user ? (
        isNew ? (
          <OnboardingNavigator />
        ) : (
          <MainStackNavigator />
        )
      ) : (
        <AuthNavigator />
      )}

      <ToastContainer />
    </>
  );
}

// ─────────────────────────────────────────────
// ROOT WRAPPER
// ─────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <FollowProvider>
          <AppNavigatorContent />
        </FollowProvider>
      </NotificationProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1624',
  },
});