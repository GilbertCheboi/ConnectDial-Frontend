import { useEffect, useContext } from 'react';
import { Platform, Alert, Linking, PermissionsAndroid } from 'react-native';
import { AuthProvider, AuthContext } from './src/store/authStore';
import { ThemeProvider } from './src/store/themeStore';
import AppNavigator from './src/navigation/AppNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import messaging from '@react-native-firebase/messaging';

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

// ─────────────────────────────────────────────────────────────────────
// Sits inside AuthProvider so it can read the logged-in user.
// Fires the permission request exactly once after the user logs in.
// ─────────────────────────────────────────────────────────────────────
function NotificationPermissionGate() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Only ask when a user is authenticated — no point asking guests
    if (!user) return;
    requestNotificationPermission();
  }, [user?.id]); // re-runs if a different user logs in, but not on every render

  return null; // renders nothing, purely side-effect
}

async function requestNotificationPermission() {
  try {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const granted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!granted) {
        // iOS only shows the system dialog once ever.
        // If denied, we nudge them toward Settings.
        Alert.alert(
          'Enable Notifications',
          'Get notified about comments, follows and activity on ConnectDial.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else if (Platform.OS === 'android' && Platform.Version >= 33) {
      // Android 13+ (API 33) requires POST_NOTIFICATIONS permission
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Enable Notifications',
          'You may miss important updates. Enable notifications in Settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
    // Android < 13: notifications are on by default, no prompt needed
  } catch (error) {
    console.warn('Notification permission error:', error);
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          {/* Asks for permission once user is logged in */}
          <NotificationPermissionGate />
          <AppNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}