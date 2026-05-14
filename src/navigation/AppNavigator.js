/**
 * AppNavigator.js - UPDATED VERSION
 * Integrates toast notifications and push notifications
 * Location: src/navigation/AppNavigator.js (REPLACE your current one)
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

/**
 * Inner navigator component that uses all contexts
 */
function AppNavigatorContent() {
  const { user, loading, isNew } = useContext(AuthContext);
  const themeContext = useContext(ThemeContext) || {};
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
  const setupDone = useRef(false);

  /**
   * Save FCM Token to Backend
   */
  const saveTokenToBackend = async (fcmToken) => {
    if (!user?.token) return;
    try {
      console.log('📱 Syncing FCM Token to Backend:', fcmToken);
      await api.patch('auth/update/', { fcm_token: fcmToken });
      console.log('✅ FCM Token successfully synced');
    } catch (error) {
      console.error(
        '❌ FCM Sync Error:',
        error?.response?.data || error.message,
      );
    }
  };

  /**
   * Setup Firebase Messaging
   */
  useEffect(() => {
    if (!user?.token || setupDone.current) return;

    const initializeMessaging = async () => {
      try {
        const msg = messaging();

        // Request permission (iOS)
        const authStatus = await msg.requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('⚠️ Notifications disabled by user');
          return;
        }

        // Get and save FCM token
        const fcmToken = await msg.getToken();
        if (fcmToken) {
          console.log('✅ FCM Token:', fcmToken);
          await saveTokenToBackend(fcmToken);
        }

        // Setup push notification handlers
        if (navigationRef.isReady()) {
          setupPushNotifications(navigationRef);
          setupDone.current = true;
        }
      } catch (error) {
        console.error('❌ Firebase setup failed:', error);
      }
    };

    initializeMessaging();
  }, [user?.token, setupPushNotifications, navigationRef]);

  /**
   * Token Refresh Listener
   */
  useEffect(() => {
    if (!user?.token) return;

    const msg = messaging();
    const unsubscribe = msg.onTokenRefresh((fcmToken) => {
      console.log('🔄 FCM Token refreshed');
      saveTokenToBackend(fcmToken);
    });

    return unsubscribe;
  }, [user?.token]);

  // Loading Screen
  if (loading || themeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  // Theme Configuration
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
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
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

/**
 * Main AppNavigator with all providers
 */
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