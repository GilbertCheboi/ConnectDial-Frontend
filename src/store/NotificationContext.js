import React, { createContext, useState, useEffect, useContext } from 'react';
import messaging from '@react-native-firebase/messaging'; // 🚀 Import messaging
import api from '../api/client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('api/notifications/unread-count/');
      setUnreadCount(response.data.unread_count);
    } catch (e) {
      console.log('Error fetching badge count', e);
    }
  };

  useEffect(() => {
    // 1. Initial fetch
    fetchUnreadCount();

    // 2. 🚀 INSTANT UPDATE: Listen for Push Notifications in the foreground
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('✨ Instant notification received in-app:', remoteMessage);

      // We could manually do setUnreadCount(prev => prev + 1),
      // but re-fetching is safer to stay in sync with the DB.
      fetchUnreadCount();
    });

    // 3. Fallback: check every 2 minutes (increased from 1 to save battery)
    const interval = setInterval(fetchUnreadCount, 120000);

    return () => {
      clearInterval(interval);
      unsubscribe(); // 🚀 Clean up the FCM listener
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, setUnreadCount, fetchUnreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
