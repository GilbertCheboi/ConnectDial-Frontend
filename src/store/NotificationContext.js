/**
 * NotificationContext.js - FIXED
 * Location: src/store/NotificationContext.js
 *
 * FIXES:
 * ✅ FIX #1: Expose `setupPushNotifications(navigationRef)` so AppNavigator
 *            can call it — previously the context never exported this function
 *            causing "setupPushNotifications is not a function" crash.
 * ✅ FIX #2: Pass the live `navigationRef` object (not `.current`) into the
 *            handler so navigation works even if ref wasn't ready at setup time.
 * ✅ FIX #3: Import matches the fixed export name from PushNotificationHandler.
 */

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from 'react';
import { setupPushNotifications as _setupPushNotifications } from '../services/PushNotificationHandler';
import api from '../api/client';
import { AuthContext } from './authStore';
import { ToastContext } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const authCtx = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  // ─────────────────────────────────────────────────────────────────────
  // handlersRef tracks the Firebase unsub functions so we can clean up
  // ─────────────────────────────────────────────────────────────────────
  const handlersRef = useRef(null);
  const setupDoneRef = useRef(false);

  // ─────────────────────────────────────────────────────────────────────
  // Fetch unread count from backend
  // ─────────────────────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!authCtx?.user?.token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get('api/notifications/unread-count/');
      const count = response.data.unread_count ?? response.data.count ?? 0;
      setUnreadCount(count);
    } catch (error) {
      console.log('❌ Error fetching unread count:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [authCtx?.user?.token]);

  // ─────────────────────────────────────────────────────────────────────
  // FIX #1 + #2: setupPushNotifications receives the navigationRef OBJECT
  // (not .current) so the handler always reads the latest ref value when
  // a notification arrives — even if it wasn't ready at setup time.
  // AppNavigator calls this after NavigationContainer is mounted.
  // ─────────────────────────────────────────────────────────────────────
  const setupPushNotifications = useCallback((navigationRef) => {
    if (setupDoneRef.current) return; // don't register handlers twice

    console.log('🔔 Setting up push notification handlers');

    // Wrap navigationRef so the handler always uses the current value
    const navProxy = {
      isReady: () => navigationRef?.isReady?.() ?? false,
      navigate: (...args) => navigationRef?.navigate?.(...args),
    };

    handlersRef.current = _setupPushNotifications(navProxy, showToast);
    setupDoneRef.current = true;
  }, [showToast]);

  // ─────────────────────────────────────────────────────────────────────
  // On login: fetch count + start polling. On logout: cleanup.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authCtx?.user?.token) {
      setLoading(false);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    // Polling fallback every 2 minutes
    const interval = setInterval(fetchUnreadCount, 120_000);

    return () => {
      clearInterval(interval);
      // Clean up Firebase listeners on logout
      if (handlersRef.current) {
        handlersRef.current.unsubscribeForeground?.();
        handlersRef.current.unsubscribeOpened?.();
        handlersRef.current.unsubscribeTokenRefresh?.();
        handlersRef.current = null;
      }
      setupDoneRef.current = false;
    };
  }, [authCtx?.user?.token, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        loading,
        // ✅ FIX #1: Now exported — AppNavigator can call this
        setupPushNotifications,
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