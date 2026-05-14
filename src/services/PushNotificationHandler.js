/**
 * PushNotificationHandler.js
 * Handles Firebase messages with SOUND + VIBRATION
 * Location: src/services/PushNotificationHandler.js
 *
 * FIXES:
 * ✅ FIX #1: RNSound constructor — require('react-native-sound') returns
 *            the module; the actual class lives at .default (or the module
 *            itself if no default export). Guard both cases so
 *            `new RNSound(...)` never throws "constructor is not callable".
 * ✅ FIX #2: Renamed export to `setupPushNotifications` to match what
 *            AppNavigator / NotificationContext call. Old name
 *            `setupPushMessageHandlers` kept as alias for safety.
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, Vibration } from 'react-native';

// ─────────────────────────────────────────────────────────────────────
// FIX #1: Safely resolve the RNSound constructor.
// require() can return { default: SoundClass } (ESM interop) or the
// class directly (CJS). Normalise to always get the callable class.
// ─────────────────────────────────────────────────────────────────────
let RNSound = null;
try {
  const mod = require('react-native-sound');
  // ESM default export wrapped by Metro bundler
  RNSound = mod?.default ?? mod;

  if (typeof RNSound !== 'function') {
    console.warn('⚠️ react-native-sound loaded but is not a constructor:', typeof RNSound);
    RNSound = null;
  } else {
    RNSound.setCategory('Playback');
    console.log('✅ react-native-sound loaded successfully');
  }
} catch (e) {
  console.warn('⚠️ react-native-sound not available:', e.message);
}

let notificationSound = null;

// ─────────────────────────────────────────────────────────────────────
// Initialize notification sound
// ─────────────────────────────────────────────────────────────────────
export const initializeSound = () => {
  if (!RNSound) return;
  try {
    notificationSound = new RNSound(
      'notification.mp3',
      RNSound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.log('❌ Failed to load custom sound, trying fallback:', error);
          loadSystemSound();
        } else {
          console.log('✅ Custom notification sound loaded successfully');
        }
      }
    );
  } catch (error) {
    console.error('❌ Sound initialization failed:', error);
    loadSystemSound();
  }
};

const loadSystemSound = () => {
  if (!RNSound) return;
  try {
    notificationSound = new RNSound(
      'notification',
      RNSound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.log('ℹ️ Using system default notification sound');
        }
      }
    );
  } catch (error) {
    console.log('ℹ️ Will use system default sound');
  }
};

// ─────────────────────────────────────────────────────────────────────
// Play / stop notification sound
// ─────────────────────────────────────────────────────────────────────
export const playNotificationSound = async () => {
  if (!RNSound) return;
  try {
    if (!notificationSound) {
      initializeSound();
      return;
    }
    notificationSound.stop(() => {
      notificationSound.play((success) => {
        if (success) {
          console.log('🔊 Notification sound played');
        } else {
          console.log('❌ Failed to play sound');
        }
      });
    });
  } catch (error) {
    console.error('❌ Error playing sound:', error);
  }
};

export const stopNotificationSound = () => {
  try {
    if (notificationSound) notificationSound.stop();
  } catch (e) {
    console.log('Error stopping sound:', e);
  }
};

export const cleanupSound = () => {
  if (notificationSound) {
    notificationSound.release();
    notificationSound = null;
  }
};

// ─────────────────────────────────────────────────────────────────────
// Vibration
// ─────────────────────────────────────────────────────────────────────
const triggerVibration = () => {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 80, 60, 80]);
    } else {
      Vibration.vibrate(400);
    }
  } catch (error) {
    console.log('Vibration failed:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────
// Handle navigation when notification is tapped
// ─────────────────────────────────────────────────────────────────────
export function handleNotificationPress(navigationRef, data) {
  if (!navigationRef?.isReady?.()) {
    console.log('⚠️ Navigation not ready');
    return;
  }

  const { notification_type, post_id, user_id, sender_id } = data || {};

  try {
    if (['like', 'comment', 'repost', 'mention'].includes(notification_type)) {
      navigationRef.navigate('PostDetail', { postId: post_id });
    } else if (notification_type === 'follow') {
      navigationRef.navigate('Profile', { userId: sender_id || user_id });
    }
  } catch (error) {
    console.error('Navigation error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Background handler — MUST be at top level (Firebase requirement)
// ─────────────────────────────────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📬 Background notification received:', remoteMessage);
  playNotificationSound();
  triggerVibration();
});

// ─────────────────────────────────────────────────────────────────────
// FIX #2: Export as BOTH names so AppNavigator / NotificationContext
// work regardless of which name they import.
//
//   AppNavigator calls:          setupPushNotifications(navigationRef)
//   Old export was named:        setupPushMessageHandlers(navigationRef, cb)
//
// The new primary export is `setupPushNotifications`.
// `setupPushMessageHandlers` is kept as an alias for any other callers.
// ─────────────────────────────────────────────────────────────────────
export function setupPushNotifications(navigationRef, showToastCallback) {
  const msg = messaging();

  // Foreground handler
  const unsubscribeForeground = msg.onMessage(async (remoteMessage) => {
    console.log('📬 Foreground notification:', remoteMessage);
    const { notification, data } = remoteMessage;

    playNotificationSound();
    triggerVibration();

    if (showToastCallback) {
      showToastCallback({
        type: data?.notification_type || 'info',
        title: notification?.title || 'New Notification',
        message: notification?.body,
        avatar: data?.sender_avatar,
        onPress: () => handleNotificationPress(navigationRef, data),
        duration: 6000,
      });
    }
  });

  // Notification opened (app in background, user taps)
  const unsubscribeOpened = msg.onNotificationOpenedApp((remoteMessage) => {
    console.log('👆 Notification opened:', remoteMessage);
    stopNotificationSound();
    if (remoteMessage?.data) {
      handleNotificationPress(navigationRef, remoteMessage.data);
    }
  });

  // Cold start (app was killed, opened via notification)
  msg.getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      console.log('🚀 Cold start notification:', remoteMessage);
      setTimeout(() => {
        handleNotificationPress(navigationRef, remoteMessage.data);
      }, 800);
    }
  });

  // Token refresh
  const unsubscribeTokenRefresh = msg.onTokenRefresh((fcmToken) => {
    console.log('🔄 FCM Token refreshed:', fcmToken);
  });

  return {
    unsubscribeForeground,
    unsubscribeOpened,
    unsubscribeTokenRefresh,
  };
}

// Alias — keeps any existing imports working
export const setupPushMessageHandlers = setupPushNotifications;