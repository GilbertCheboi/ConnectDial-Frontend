import React, { useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthContext } from '../store/authStore';
import AuthNavigator from '../api/AuthNavigator';
import MainDrawerNavigator from './MainDrawerNavigator'; // Updated import
import OnboardingNavigator from '../api/OnboardingNavigator';
import MainStackNavigator from './MainStackNavigator'; // NEW: Stack that includes Drawer + Comments

export default function AppNavigator() {
  const { user, loading, isNew } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        isNew ? (
          <OnboardingNavigator />
        ) : (
          <MainStackNavigator /> // 🚀 This now wraps both Drawer and Comments
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1F2D',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
