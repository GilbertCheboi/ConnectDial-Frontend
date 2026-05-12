/**
 * NotificationContext.js - FULLY ENHANCED
 * Integrates Toast + Firebase Push with Sound + Vibration (Foreground + Background)
 * Location: src/store/NotificationContext.js
 */

import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { setupPushMessageHandlers } from '../services/PushNotificationHandler';
import api from '../api/client';
import { AuthContext } from './authStore';
import { ToastContext } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const authCtx = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const navigationRef = useRef(null); // You'll pass this from AppNavigator

  /**
   * Fetch unread notification count from backend
   */
  const fetchUnreadCount = async () => {
    if (!authCtx?.user?.token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('api/notifications/unread-count/');
      const count = response.data.unread_count || response.data.count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.log('❌ Error fetching unread count:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigate based on notification type
   */
  const handleNotificationNavigation = (data) => {
    if (!navigationRef.current?.isReady()) {
      console.log('⚠️ Navigation not ready yet');
      return;
    }

    const { notification_type, post_id, user_id, sender_id } = data;

    try {
      if (['like', 'comment', 'repost', 'mention'].includes(notification_type)) {
        navigationRef.current.navigate('PostDetail', { postId: post_id });
      } else if (notification_type === 'follow') {
        navigationRef.current.navigate('Profile', { userId: sender_id || user_id });
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  /**
   * Setup Push Notifications with Sound + Vibration
   */
  useEffect(() => {
    if (!authCtx?.user?.token) {
      setLoading(false);
      return;
    }

    // Fetch initial count
    fetchUnreadCount();

    // Setup Firebase handlers (Foreground sound, vibration, toast, etc.)
    const handlers = setupPushMessageHandlers(
      navigationRef.current,
      showToast
    );

    // Polling fallback (every 2 minutes)
    const interval = setInterval(fetchUnreadCount, 120000);

    return () => {
      clearInterval(interval);
      // Cleanup handlers
      if (handlers) {
        handlers.unsubscribeForeground?.();
        handlers.unsubscribeOpened?.();
        handlers.unsubscribeTokenRefresh?.();
      }
    };
  }, [authCtx?.user?.token, showToast]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        loading,
        handleNotificationNavigation,
        navigationRef, // expose if needed
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};