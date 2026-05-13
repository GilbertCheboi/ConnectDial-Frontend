/**
 * PushNotificationHandler.js
 * Handles Firebase messages with SOUND + VIBRATION
 * Location: src/services/PushNotificationHandler.js
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, Vibration } from 'react-native';

let RNSound = null;
try {
  RNSound = require('react-native-sound');
  RNSound.setCategory('Playback');
} catch (e) {
  console.warn('⚠️ react-native-sound not available:', e.message);
}

let notificationSound = null;

/**
 * Initialize notification sound
 */
export const initializeSound = () => {
  if (!RNSound) return;
  try {
    notificationSound = new RNSound(
      'notification.mp3',
      RNSound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.log('❌ Failed to load custom sound:', error);
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

/**
 * Play notification sound
 */
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
    console.log('Error stopping sound');
  }
};

/**
 * Trigger vibration (using built-in API)
 */
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

/**
 * Handle navigation when notification is tapped
 */
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

/**
 * Background handler — MUST be at top level (Firebase requirement)
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📬 Background notification received:', remoteMessage);
  playNotificationSound();
  triggerVibration();
});

/**
 * Setup Message Handlers (Foreground only now)
 */
export function setupPushMessageHandlers(navigationRef, showToastCallback) {
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

/**
 * Cleanup
 */
export const cleanupSound = () => {
  if (notificationSound) {
    notificationSound.release();
    notificationSound = null;
  }
};