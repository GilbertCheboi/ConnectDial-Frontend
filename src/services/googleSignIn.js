import { GoogleSignin } from '@react-native-google-signin/google-signin';

console.log('GoogleSignin object:', GoogleSignin);


export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '597689072930-lf6o7j50lqv8ro2qc4lluq06gribo16h.apps.googleusercontent.com', // ✅ correct
    offlineAccess: true,
  });
};