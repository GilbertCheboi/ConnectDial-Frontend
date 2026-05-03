/**
 * NotificationContext.js
 * Fixed & Improved Version
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import messaging from '@react-native-firebase/messaging';
import api from '../api/client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/notifications/unread-count/'); // ← Fixed leading slash
      const count = response.data.unread_count || response.data.count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.log('Error fetching unread count:', error.response?.data || error.message);
      // Don't crash the app if this fails
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Listen for foreground notifications (instant update)
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
      console.log('New foreground notification received:', remoteMessage);
      fetchUnreadCount();        // Refresh count immediately
    });

    // Optional: Listen for token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM Token refreshed');
      // You can re-send token to backend here if needed
    });

    // Polling as fallback (every 2 minutes)
    const interval = setInterval(fetchUnreadCount, 120000);

    return () => {
      clearInterval(interval);
      unsubscribeOnMessage();
      unsubscribeTokenRefresh();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        loading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);