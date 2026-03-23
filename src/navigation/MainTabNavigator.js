import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// 🚀 1. Import the hook correctly
import { useNotifications } from '../store/NotificationContext';

// Screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationScreen from '../screens/NotificationsScreen';
import ShortsScreen from '../screens/ShortsScreen';
import CreatePostScreen from '../components/CreatePostScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  // 🚀 2. Pull the unreadCount from your global store
  const { unreadCount } = useNotifications();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1E90FF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#0D1F2D',
          borderTopWidth: 0.5,
          borderTopColor: '#162A3B',
          height: Platform.OS === 'ios' ? 88 : 70, // Slightly taller for better UX
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Shorts"
        component={ShortsScreen}
        options={{
          title: 'Watch',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'play-circle' : 'play-circle-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* 🚀 3. THE CENTER POST BUTTON */}
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Post',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={32}
              color={color}
            />
          ),
          headerShown: true,
          headerTitle: 'Create Post',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />

      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          // 🚀 4. Use the unreadCount variable here
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: {
            backgroundColor: '#FF4B4B',
            color: 'white',
            fontSize: 10,
            lineHeight: 15, // Centers the number better
          },
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'notifications' : 'notifications-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
