/**
 * NotificationContext.js
 * Fixed & Improved Version
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import messaging from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import api from '../api/client';
import { AuthContext } from '../store/authStore';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    const { user } = authCtx;
    if (!user?.token) {
      setLoading(false);
      return; // don't call protected endpoint when unauthenticated
    }

    try {
      const response = await api.get('/api/notifications/unread-count/');
      const count = response.data.unread_count || response.data.count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.log('Error fetching unread count:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const authCtx = useContext(AuthContext);

  useEffect(() => {
    fetchUnreadCount();

    // Listen for foreground notifications (instant update)
    const msg = messaging(getApp());
    const unsubscribeOnMessage = msg.onMessage(async (remoteMessage) => {
      console.log('New foreground notification received:', remoteMessage);
      fetchUnreadCount();        // Refresh count immediately
    });

    // Optional: Listen for token refresh
    const unsubscribeTokenRefresh = msg.onTokenRefresh(async (newToken) => {
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