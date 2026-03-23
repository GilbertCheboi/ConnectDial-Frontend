import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainDrawerNavigator from './MainDrawerNavigator';
import CommentsScreen from '../screens/CommentsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingNavigator from '../api/OnboardingNavigator';
// 🚀 Import the universal screen (formerly CreateProfileScreen)
import EditProfileScreen from '../screens/onboarding/EditProfileScreen';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {/* 1. The main app (Drawer + Tabs) */}
      <Stack.Screen name="MainApp" component={MainDrawerNavigator} />

      {/* 2. Post and Interaction Screens */}
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

      {/* 3. Profile & Edit Flow */}
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

      {/* 🚀 Universal Edit/Create Screen */}
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />

      {/* 4. Onboarding Stack */}
      <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
    </Stack.Navigator>
  );
}
