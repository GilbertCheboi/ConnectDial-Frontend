import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNotifications } from '../store/NotificationContext';
import { ThemeContext } from '../store/themeStore';

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
  const themeContext = useContext(ThemeContext) || {};
  const theme = themeContext.theme || {
    colors: {
      tabBar: '#0D1F2D',
      tabBarInactive: '#888',
      primary: '#1E90FF',
      border: '#162A3B',
    },
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        // 🚀 DYNAMIC TAB BAR HIDING
        tabBarStyle: (route => {
          const routeName = route.name;
          if (routeName === 'Shorts') {
            return { display: 'none' }; // Completely removes Tab Bar for Shorts
          }
          return {
            backgroundColor: theme.colors.tabBar,
            borderTopWidth: 0.5,
            borderTopColor: theme.colors.border,
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingBottom: Platform.OS === 'ios' ? 30 : 12,
            paddingTop: 10,
          };
        })(route),
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
          // 🚀 Ensure the Header is hidden even if the Drawer tries to show it
          headerShown: false,
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
