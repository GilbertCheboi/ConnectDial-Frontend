/**
 * AppNavigator.js - FIXED
 * Location: src/navigation/AppNavigator.js
 *
 * FIXES:
 * ✅ FIX #1: Call setupPushNotifications(navigationRef) AFTER
 *            NavigationContainer mounts — previously called before the
 *            ref was ready, so navigation inside handlers was always null.
 * ✅ FIX #2: setupPushNotifications now correctly comes from
 *            NotificationContext (it was missing there before — fixed in
 *            NotificationContext.js).
 */

import React, { useContext, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
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

// Components
import { ToastContainer } from '../components/ToastContainer';

// ─────────────────────────────────────────────────────────────────────
// Inner component — has access to all contexts
// ─────────────────────────────────────────────────────────────────────
function AppNavigatorContent() {
  const { user, loading, isNew } = useContext(AuthContext);
  const themeContext = useContext(ThemeContext) || {};

  // ✅ FIX #2: setupPushNotifications is now properly exported from context
  const { setupPushNotifications } = useNotifications();

  const themeName = themeContext.themeName || 'dark';
  const theme = themeContext.theme || {
    colors: {
      primary: '#1E90FF',
      background: '#0A1624',
      card: '#0D1F2D',
      text: '#F8FAFC',
      border: '#1E293B',
      notification: '#FF4B4B',
    },
  };

  const themeLoading = themeContext.loading || false;
  const navigationRef = useNavigationContainerRef();
  const fcmSetupDone = useRef(false);

  // ─────────────────────────────────────────────────────────────────────
  // Save FCM token to backend
  // ─────────────────────────────────────────────────────────────────────
  const saveTokenToBackend = async (fcmToken) => {
    if (!user?.token) return;
    try {
      console.log('📱 Syncing FCM Token to backend');
      await api.patch('auth/update/', { fcm_token: fcmToken });
      console.log('✅ FCM Token synced');
    } catch (error) {
      console.error('❌ FCM sync error:', error?.response?.data || error.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Firebase setup — runs once after user logs in
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token || fcmSetupDone.current) return;

    const initializeMessaging = async () => {
      try {
        const msg = messaging();

        // Request permission (iOS — Android 13+ handled in App.tsx)
        const authStatus = await msg.requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('⚠️ Notifications disabled by user');
          return;
        }

        // Get and sync FCM token
        const fcmToken = await msg.getToken();
        if (fcmToken) {
          await saveTokenToBackend(fcmToken);
        }

        fcmSetupDone.current = true;
        console.log('✅ Firebase messaging initialised');
      } catch (error) {
        console.error('❌ Firebase setup failed:', error);
      }
    };

    initializeMessaging();
  }, [user?.token]);

  // ─────────────────────────────────────────────────────────────────────
  // Token refresh listener
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) return;
    const msg = messaging();
    const unsubscribe = msg.onTokenRefresh(saveTokenToBackend);
    return unsubscribe;
  }, [user?.token]);

  // ─────────────────────────────────────────────────────────────────────
  // Loading screen
  // ─────────────────────────────────────────────────────────────────────
  if (loading || themeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // Navigation theme
  // ─────────────────────────────────────────────────────────────────────
  const navigationTheme =
    themeName === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.notification,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.notification,
          },
        };

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        // ✅ FIX #1: onReady fires after NavigationContainer fully mounts,
        // so navigationRef.current is valid when setupPushNotifications runs.
        // Previously this was called in a useEffect before the container
        // was ready, causing navigation inside handlers to silently fail.
        onReady={() => {
          if (user) {
            console.log('🗺️ Navigation ready — setting up push handlers');
            setupPushNotifications(navigationRef);
          }
        }}
      >
        {user ? (
          isNew ? (
            <OnboardingNavigator />
          ) : (
            <MainStackNavigator />
          )
        ) : (
          <AuthNavigator />
        )}
      </NavigationContainer>
      <ToastContainer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Root AppNavigator with all providers
// ─────────────────────────────────────────────────────────────────────
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