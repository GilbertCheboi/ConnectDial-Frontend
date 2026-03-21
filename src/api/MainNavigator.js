import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CommentsScreen from '../screens/CommentsScreen'; // <-- NEW IMPORT

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{ title: 'Comments' }}
      />
    </Stack.Navigator>
  );
}
