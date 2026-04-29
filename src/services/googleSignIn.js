import { GoogleSignin } from '@react-native-google-signin/google-signin';

console.log('GoogleSignin object:', GoogleSignin);


export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com', // ✅ correct
    offlineAccess: true,
  });
};
