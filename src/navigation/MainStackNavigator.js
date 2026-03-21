import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainDrawerNavigator from './MainDrawerNavigator';
import CommentsScreen from '../screens/CommentsScreen';
import PostDetailScreen from '../screens/PostDetailScreen'; // Create this next
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // We use the drawer's header or custom headers
        gestureEnabled: true, // Allows swipe-to-go-back
      }}
    >
      {/* 1. The main app (Drawer + Tabs) */}
      <Stack.Screen name="MainApp" component={MainDrawerNavigator} />

      {/* 2. The hidden screen (Available via code, but no button in UI) */}
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          headerShown: true,
          title: 'Comments',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          headerShown: true,
          title: 'Post',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}
