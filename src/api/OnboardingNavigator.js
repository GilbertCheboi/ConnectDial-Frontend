import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ChooseLeaguesScreen from '../screens/onboarding/ChooseLeaguesScreen';
import ChooseTeamsScreen from '../screens/onboarding/ChooseTeamsScreen';
// FIX 1: Import the correct CreateProfileScreen component
import CreateProfileScreen from '../screens/onboarding/CreateProfileScreen';
const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />

      {/* FIX 2: Ensure these names match what you use in 
          navigation.navigate('SelectLeagues') etc. 
      */}
      <Stack.Screen name="SelectLeagues" component={ChooseLeaguesScreen} />

      {/* In ChooseLeaguesScreen, you should call: 
          navigation.navigate('SelectTeams', { selectedLeagues: [...] }) 
      */}
      <Stack.Screen name="SelectTeams" component={ChooseTeamsScreen} />

      {/* In ChooseTeamsScreen, you should call: 
          navigation.navigate('CreateProfile') 
      */}
      <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
    </Stack.Navigator>
  );
}
