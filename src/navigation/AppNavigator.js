import React, { useContext, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import axios from 'axios';

// Contexts & Providers
import { AuthContext } from '../store/authStore';
import { NotificationProvider } from '../store/NotificationContext';
import { FollowProvider } from '../store/FollowContext';

// Navigators
import AuthNavigator from '../api/AuthNavigator';
import OnboardingNavigator from '../api/OnboardingNavigator';
import MainStackNavigator from './MainStackNavigator';

export default function AppNavigator() {
  const { user, loading, isNew } = useContext(AuthContext);

  // 🚀 Create a reference to the navigation container to navigate from useEffect
  const navigationRef = useNavigationContainerRef();

  // Helper to route the user based on notification data
  const handleNotificationNavigation = data => {
    if (!data || !data.type || !data.id) return;

    console.log('🚀 Navigating based on data:', data);

    // Ensure the navigator is ready before trying to navigate
    if (navigationRef.isReady()) {
      if (
        data.type === 'like' ||
        data.type === 'comment' ||
        data.type === 'repost'
      ) {
        // Navigate to PostDetail (Ensure this screen exists in MainStackNavigator)
        navigationRef.navigate('PostDetail', { postId: data.id });
      } else if (data.type === 'follow') {
        // Navigate to Profile
        navigationRef.navigate('Profile', { userId: data.id });
      }
    }
  };

  useEffect(() => {
    const saveTokenToBackend = async fcmToken => {
      try {
        console.log('📱 Syncing FCM Token to Backend:', fcmToken);
        await axios.patch(
          'http://192.168.100.107:8000/auth/update/',
          { fcm_token: fcmToken },
          {
            headers: {
              Authorization: `Token ${user.token}`,
              'Content-Type': 'application/json',
            },
          },
        );
        console.log('✅ FCM Token Linked to Profile');
      } catch (error) {
        console.error(
          '❌ FCM Sync Error:',
          error?.response?.data || error.message,
        );
      }
    };

    const setupMessaging = async () => {
      if (user && user.token) {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const currentToken = await messaging().getToken();
          await saveTokenToBackend(currentToken);
        }
      }
    };

    setupMessaging();

    // 1. Handle Notification when app is in BACKGROUND (but still in memory)
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      remoteMessage => {
        console.log(
          'Notification opened app from background:',
          remoteMessage.data,
        );
        handleNotificationNavigation(remoteMessage.data);
      },
    );

    // 2. Handle Notification when app is CLOSED (Quit State)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification opened app from quit state:',
            remoteMessage.data,
          );
          // Small delay to ensure navigation stack is mounted
          setTimeout(
            () => handleNotificationNavigation(remoteMessage.data),
            500,
          );
        }
      });

    // 3. Foreground Message Handler
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have a new message!',
        [
          {
            text: 'View',
            onPress: () => handleNotificationNavigation(remoteMessage.data),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    });

    const onTokenRefresh = messaging().onTokenRefresh(token => {
      if (user?.token) saveTokenToBackend(token);
    });

    return () => {
      onTokenRefresh();
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <FollowProvider>
        {/* 🚀 Pass the navigationRef here */}
        <NavigationContainer ref={navigationRef}>
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
      </FollowProvider>
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
