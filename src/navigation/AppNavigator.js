import React, { useContext, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import axios from 'axios';

// Contexts
import { AuthContext } from '../store/authStore';
import { ThemeContext } from '../store/themeStore';
import { NotificationProvider } from '../store/NotificationContext';
import { FollowProvider } from '../store/FollowContext';

// Navigators
import AuthNavigator from '../api/AuthNavigator';
import OnboardingNavigator from '../api/OnboardingNavigator';
import MainStackNavigator from './MainStackNavigator';

const BASE_URL = 'http://10.199.198.22:8000';

export default function AppNavigator() {
  const { user, loading, isNew } = useContext(AuthContext);   // ← Fixed: using isNew
  const themeContext = useContext(ThemeContext) || {};

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

  // Handle deep linking from notifications
  const handleNotificationNavigation = (data) => {
    if (!data?.type || !data?.id) return;
    if (navigationRef.isReady()) {
      if (['like', 'comment', 'repost'].includes(data.type)) {
        navigationRef.navigate('PostDetail', { postId: data.id });
      } else if (data.type === 'follow') {
        navigationRef.navigate('Profile', { userId: data.id });
      }
    }
  };

  // FCM Token Sync
  const saveTokenToBackend = async (fcmToken) => {
    if (!user?.token) return;
    try {
      console.log('📱 Syncing FCM Token to Backend:', fcmToken);
      await axios.patch(
        `${BASE_URL}/auth/update/`,
        { fcm_token: fcmToken },
        {
          headers: {
            Authorization: `Token ${user.token}`,   // ← Also fixed to Token
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('✅ FCM Token successfully linked to profile');
    } catch (error) {
      console.error('❌ FCM Sync Error:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    const setupMessaging = async () => {
      if (!user?.token) return;
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const currentToken = await messaging().getToken();
          await saveTokenToBackend(currentToken);
        }
      } catch (err) {
        console.error('Messaging setup failed:', err);
      }
    };

    setupMessaging();

    // Notification Handlers
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => handleNotificationNavigation(remoteMessage.data)
    );

    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        setTimeout(() => handleNotificationNavigation(remoteMessage.data), 800);
      }
    });

    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have a new message!',
        [
          { text: 'View', onPress: () => handleNotificationNavigation(remoteMessage.data) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    });

    const onTokenRefresh = messaging().onTokenRefresh((fcmToken) => {
      saveTokenToBackend(fcmToken);
    });

    return () => {
      unsubscribeOnNotificationOpened();
      unsubscribeOnMessage();
      onTokenRefresh();
    };
  }, [user?.token, handleNotificationNavigation, saveTokenToBackend]);

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
    <NotificationProvider>
      <FollowProvider>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          {user ? (
            isNew ? (               // ← Now correctly using isNew
              <OnboardingNavigator />
            ) : (
              <MainStackNavigator />
            )
          ) : (
            <AuthNavigator />
          )}
        </NavigationContainer>
      </FollowProvider>
    </NotificationProvider>
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