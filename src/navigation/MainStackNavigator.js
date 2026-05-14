import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainDrawerNavigator from './MainDrawerNavigator';
import CommentsScreen from '../screens/CommentsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingNavigator from '../api/OnboardingNavigator';
import EditProfileScreen from '../screens/onboarding/EditProfileScreen';
import ShortEditorScreen from '../screens/ShortEditorScreen';
import FollowersList from '../screens/FollowersList';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {/* 1. Main App */}
      <Stack.Screen
        name="MainApp"
        component={MainDrawerNavigator}
      />

      {/* 2. Post & Interaction Screens */}
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

      {/* 3. Profile Screens */}
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

      {/* Followers / Following List */}
      <Stack.Screen
        name="FollowersList"
        component={FollowersList}
        options={({ route }) => ({
          headerShown: true,
          title: route.params?.title || 'Connections',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        })}
      />

      {/* Shorts */}
      <Stack.Screen
        name="ShortEditor"
        component={ShortEditorScreen}
        options={{
          headerShown: true,
          title: 'Edit Short',
          headerStyle: { backgroundColor: '#0D1F2D' },
          headerTintColor: '#fff',
        }}
      />

      {/* 4. Onboarding */}
      <Stack.Screen
        name="Onboarding"
        component={OnboardingNavigator}
      />
    </Stack.Navigator>
  );
}