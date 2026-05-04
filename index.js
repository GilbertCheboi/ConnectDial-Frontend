/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';

// 🚀 REGISTER THE BACKGROUND HANDLER
// This must be at the top level of index.js
messaging(getApp()).setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);

  // Optional: You can perform background logic here (like updating local storage)
  // No need to call Alert.alert here; the OS will automatically show the notification
  // banner if the 'notification' object is present in the payload.
});

AppRegistry.registerComponent(appName, () => App);
