// babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ... other plugins (like react-native-paper, etc.)
    'react-native-reanimated/plugin', // THIS MUST BE THE LAST ENTRY
  ],
};
