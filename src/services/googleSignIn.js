import { GoogleSignin } from '@react-native-google-signin/google-signin';

console.log('GoogleSignin object:', GoogleSignin);


export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '552464323715-sh3l9naon0ivmn0rl0tnjhfbqhptdc4f.apps.googleusercontent.com', // From Google Cloud Console
    offlineAccess: true,
  });
};
