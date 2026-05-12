/**
 * PushNotificationHandler.js
 * Handles Firebase messages with SOUND + VIBRATION
 * Location: src/services/PushNotificationHandler.js
 */

import messaging from '@react-native-firebase/messaging';
import { Platform, Vibration } from 'react-native';
import RNSound from 'react-native-sound';

RNSound.setCategory('Playback');

let notificationSound = null;

/**
 * Initialize notification sound
 */
export const initializeSound = () => {
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
      Vibration.vibrate([0, 80, 60, 80]); // Short exciting pattern
    } else {
      Vibration.vibrate(400); // iOS
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
 * Setup Message Handlers (Foreground + Background)
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

  // Background handler (when app is in background)
  const unsubscribeBackground = messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('📬 Background notification received:', remoteMessage);
    // Sound & vibration will be handled by system notification mostly
    // But we can try custom handling
    playNotificationSound();
    triggerVibration();
  });

  // Notification opened
  const unsubscribeOpened = msg.onNotificationOpenedApp((remoteMessage) => {
    console.log('👆 Notification opened:', remoteMessage);
    stopNotificationSound();
    if (remoteMessage?.data) {
      handleNotificationPress(navigationRef, remoteMessage.data);
    }
  });

  // Cold start
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
    unsubscribeBackground,
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