/**
 * ToastContainer.js
 * Renders toast notifications with animations
 * Location: src/components/ToastContainer.js
 */

import React, { useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ToastContext } from '../store/ToastContext';
import { ThemeContext } from '../store/themeStore';

/**
 * Individual Toast Notification Component
 */
function ToastNotification({ toast, onRemove }) {
  const slideAnim = new Animated.Value(-120);
  const { theme } = useContext(ThemeContext) || {
    theme: {
      colors: {
        background: '#0D1F2D',
        text: '#FFFFFF',
        subText: '#94A3B8',
        primary: '#1E90FF',
        card: '#112634',
        notificationBadge: '#FF4B4B',
      },
    },
  };

  useEffect(() => {
    // Slide in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Slide out before removal
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onRemove());
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, slideAnim, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'like':
        return { name: 'heart', color: '#FF4B4B' };
      case 'follow':
        return { name: 'person-add', color: theme.colors.primary };
      case 'comment':
        return { name: 'chatbubble-ellipses', color: '#10B981' };
      case 'mention':
        return { name: 'at-circle', color: '#F59E0B' };
      case 'repost':
        return { name: 'repeat', color: '#8B5CF6' };
      case 'success':
        return { name: 'checkmark-circle', color: '#10B981' };
      case 'error':
        return { name: 'close-circle', color: '#FF4B4B' };
      case 'info':
        return { name: 'information-circle', color: theme.colors.primary };
      default:
        return { name: 'notifications', color: theme.colors.subText };
    }
  };

  const icon = getIcon();

  return (
    <Animated.View
      style={[
        styles(theme).container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles(theme).content}
        activeOpacity={0.8}
        onPress={() => {
          if (toast.onPress) toast.onPress();
          onRemove();
        }}
      >
        {/* Avatar */}
        {toast.avatar && (
          <Image
            source={{ uri: toast.avatar }}
            style={styles(theme).avatar}
          />
        )}

        {/* Icon Badge */}
        {!toast.avatar && (
          <View
            style={[
              styles(theme).iconBadge,
              { backgroundColor: icon.color },
            ]}
          >
            <Ionicons
              name={icon.name}
              size={18}
              color="#FFFFFF"
              style={{ marginRight: -2 }}
            />
          </View>
        )}

        {/* Text Content */}
        <View style={styles(theme).textContainer}>
          <Text
            style={styles(theme).title}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {toast.title}
          </Text>
          {toast.message && (
            <Text
              style={styles(theme).message}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {toast.message}
            </Text>
          )}
        </View>

        {/* Close Button */}
        <TouchableOpacity
          onPress={onRemove}
          style={styles(theme).closeButton}
        >
          <Ionicons
            name="close"
            size={16}
            color={theme.colors.subText}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Toast Container - renders all active toasts
 */
export function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      paddingTop: 8,
      zIndex: 9999,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: theme.colors.background,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
    },
    message: {
      color: theme.colors.subText,
      fontSize: 12,
      fontWeight: '400',
    },
    closeButton: {
      padding: 8,
      marginLeft: 8,
    },
  });