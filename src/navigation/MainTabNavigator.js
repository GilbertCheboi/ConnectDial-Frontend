import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ShortsScreen from '../screens/ShortsScreen';
import CreatePostScreen from '../components/CreatePostScreen'; // <-- 1. IMPORT HERE

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
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
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Shorts') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'CreatePost') {
            // 2. SPECIAL ICON FOR POSTING
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            size = 32; // Make the post button a bit bigger
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />

      <Tab.Screen
        name="Shorts"
        component={ShortsScreen}
        options={{ title: 'Watch' }}
      />

      {/* 3. ADD THE CREATE POST TAB HERE */}
      <Tab.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Post',
          // Optional: If you want the header to show on this specific screen
          headerShown: true,
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />

      <Tab.Screen name="Search" component={SearchScreen} />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: 3,
          tabBarBadgeStyle: { backgroundColor: '#FF4B4B', fontSize: 10 },
        }}
      />
    </Tab.Navigator>
  );
}
