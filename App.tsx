import React, { useEffect, useContext, useRef, useState } from 'react';
import { Alert, Platform, Linking, PermissionsAndroid, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './src/store/authStore';
import { ThemeProvider } from './src/store/themeStore';
import AppNavigator from './src/navigation/AppNavigator';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import messaging from '@react-native-firebase/messaging';

const NAVIGATION_KEY = 'NAVIGATION_STATE_V1';
const RQ_CACHE_KEY = 'RQ_CACHE_V1';

// ─────────────────────────────────────────────
// React Query setup
// ─────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// ─────────────────────────────────────────────
// Persist React Query cache (offline-like cache)
// ─────────────────────────────────────────────
persistQueryClient({
  queryClient,
  persister: {
    persistClient: async (client) => {
      await AsyncStorage.setItem(RQ_CACHE_KEY, JSON.stringify(client));
    },
    restoreClient: async () => {
      const cache = await AsyncStorage.getItem(RQ_CACHE_KEY);
      return cache ? JSON.parse(cache) : undefined;
    },
    removeClient: async () => {
      await AsyncStorage.removeItem(RQ_CACHE_KEY);
    },
  },
});

// ─────────────────────────────────────────────
// Notification Permission Gate
// ─────────────────────────────────────────────
function NotificationPermissionGate() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (!user) return;
    requestNotificationPermission();
  }, [user?.id]);

  return null;
}

async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const granted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!granted) {
        Alert.alert(
          'Enable Notifications',
          'Get updates for likes, comments, and followers.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Enable Notifications',
          'Turn on notifications in settings to stay updated.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  } catch (err) {
    console.warn('Notification permission error:', err);
  }
}

// ─────────────────────────────────────────────
// Navigation persistence wrapper
// ─────────────────────────────────────────────
function NavigationPersistence({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState();
  const navigationRef = useRef(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(NAVIGATION_KEY);
        if (saved) setInitialState(JSON.parse(saved));
      } catch (e) {
        console.log('Navigation restore error:', e);
      } finally {
        setIsReady(true);
      }
    };

    restore();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      initialState={initialState}
      onStateChange={(state) => {
        AsyncStorage.setItem(NAVIGATION_KEY, JSON.stringify(state));
      }}
    >
      {children}
    </NavigationContainer>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>

          {/* Ask notification permission once logged in */}
          <NotificationPermissionGate />

          {/* Navigation persistence layer */}
          <NavigationPersistence>
            <AppNavigator />
          </NavigationPersistence>

        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}