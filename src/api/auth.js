/**
 * src/api/auth.js
 */
import api from './client';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistSession = async (key, user) => {
  await AsyncStorage.multiSet([
    ['authToken', key],
    ['user_data', JSON.stringify(user || {})],
  ]);
};

// LOGIN
export const loginUser = async (username, password) => {
  const { data } = await api.post('auth/login/', { username, password });
  await persistSession(data.key, data.user);
  return data;
};

// OTP
export const sendOTP = async (identifier, purpose = 'login') => {
  const { data } = await api.post('auth/otp/send/', { identifier, purpose });
  return data;
};

export const verifyOTP = async (identifier, otp, purpose = 'login') => {
  const { data } = await api.post('auth/otp/verify/', { identifier, otp, purpose });
  if (purpose === 'login' && data.key) {
    await persistSession(data.key, data.user);
  }
  return data;
};

export const resendLoginOTP = (identifier) => sendOTP(identifier, 'login');
export const verifyLoginOTP = (identifier, otp) => verifyOTP(identifier, otp, 'login');

// REGISTER
export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await api.post('auth/register/', { username, email, password1, password2 });
  if (data.token) {
    await persistSession(data.token, data.user);
  }
  return data;
};

// ── GOOGLE ───────────────────────────────────────────────────────────────────

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    // ✅ MUST be the Web OAuth 2.0 Client ID from Google Cloud Console
    // (NOT the Android client ID — the web client ID is what the backend verifies)
    webClientId: '597689072930-lf6o7j50lqv8ro2qc4lluq06gribo16h.apps.googleusercontent.com',
    // ✅ offlineAccess MUST be false — setting it true causes Google to return
    // a serverAuthCode instead of an idToken on many Android devices,
    // which breaks direct id_token verification on the backend.
    offlineAccess: false,
    // ✅ forceCodeForRefreshToken false for same reason
    forceCodeForRefreshToken: false,
  });
};

/**
 * Extracts the idToken from the GoogleSignin.signIn() response.
 *
 * The response shape changed across library versions:
 *   - v6–v12 (old):  { idToken: '...' }           ← top-level
 *   - v13+   (new):  { data: { idToken: '...' } }  ← nested under data
 *
 * This helper handles both shapes so the code works regardless of
 * which version is installed.
 */
const extractIdToken = (userInfo) => {
  if (userInfo?.data?.idToken) return userInfo.data.idToken;
  if (userInfo?.idToken) return userInfo.idToken;

  return null;
};

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // ✅ Wrap signOut in try/catch — throws if no user is currently signed in
    // (e.g. first launch). We still want to force the account picker when possible.
    try {
      await GoogleSignin.signOut();
    } catch (_) {
      // Ignore — no user was signed in, that's fine
    }

    const userInfo = await GoogleSignin.signIn();

    // Modern response handling
    let idToken = null;

    if (userInfo?.type === 'success') {
      idToken = userInfo.data?.idToken;
    } else {
      throw new Error('Google sign-in was cancelled or failed');
    }

    if (!idToken) {
      throw new Error(
        'No idToken received from Google.\n' +
        'Checklist:\n' +
        '  1. webClientId must be the WEB OAuth client ID (not Android/iOS)\n' +
        '  2. offlineAccess must be false\n' +
        '  3. SHA-1 fingerprint must be registered in Google Cloud Console\n' +
        '  4. google-services.json must be up to date'
      );
    }

    console.log('Sending id_token to backend...');

    const { data } = await api.post('auth/social/google/', {
      id_token: idToken,
    });

    if (!data.key) {
      throw new Error('Backend did not return auth token. Check backend logs.');
    }

    await persistSession(data.key, data.user);
    return {
      token: data.key,
      user: data.user,
      isNewUser: data.is_new_user ?? false,
    };
  } catch (error) {
    console.error('Google Login Error:', error?.code, error?.message);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User pressed back — rethrow so the UI can handle it silently
      throw error;
    }

    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Google Sign-In is already in progress.');
    }

    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available on this device.');
    }

    throw error;
  }
};

// PASSWORD
export const requestPasswordReset = async (email) => {
  const { data } = await api.post('auth/password/forgot/', { email });
  return data;
};

export const verifyResetOTP = async (identifier, otp) => {
  const { data } = await api.post('auth/otp/verify/', {
    identifier,
    otp,
    purpose: 'password_reset',
  });
  return data.reset_token;
};

export const resetPassword = async (resetToken, newPassword) => {
  const { data } = await api.post('auth/password/reset/', {
    reset_token: resetToken,
    new_password: newPassword,
  });
  return data;
};

export const changePassword = async (oldPassword, newPassword) => {
  const { data } = await api.post('auth/password/change/', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  if (data.key) await AsyncStorage.setItem('authToken', data.key);
  return data;
};

// EMAIL VERIFICATION
export const sendEmailVerification = async () => {
  const { data } = await api.post('auth/email/send-verification/');
  return data;
};

export const verifyEmail = async (otp) => {
  const { data } = await api.post('auth/email/verify/', { otp });
  if (data.key) await AsyncStorage.setItem('authToken', data.key);
  return data;
};

// 2FA
export const setup2FA = async () => {
  const { data } = await api.post('auth/2fa/setup/');
  return data;
};

export const verify2FASetup = async (totpCode) => {
  const { data } = await api.post('auth/2fa/verify-setup/', { totp_code: totpCode });
  if (data.key) await AsyncStorage.setItem('authToken', data.key);
  return data;
};

export const validate2FA = async (totpCode) => {
  const { data } = await api.post('auth/2fa/validate/', { totp_code: totpCode });
  return data;
};

export const disable2FA = async (totpCode) => {
  const { data } = await api.post('auth/2fa/disable/', { totp_code: totpCode });
  return data;
};

export const get2FAStatus = async () => {
  const { data } = await api.get('auth/2fa/status/');
  return data;
};

// TOKEN
export const checkToken = async () => {
  const { data } = await api.get('auth/token/check/');
  return data;
};

// LOGOUT
export const logoutUser = async () => {
  try {
    await api.post('auth/logout/');
  } catch (error) {
    console.warn('Server logout failed (clearing local session anyway):', error.message);
  } finally {
    await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
    // Also sign out of Google so next login shows account picker
    try {
      await GoogleSignin.signOut();
    } catch (_) {
      // Ignore if not signed in
    }
  }
};

// PROFILE & SOCIAL
export const getProfile = async (params = {}) => {
  const { data } = await api.get('auth/update/', { params });
  return data;
};

export const updateProfile = async (profileData, params = {}) => {
  const { data } = await api.patch('auth/update/', profileData, { params });
  return data;
};

export const searchProfiles = async (query) => {
  const { data } = await api.get('auth/search/', { params: { search: query } });
  return data;
};

export const toggleFollow = async (userId) => {
  const { data } = await api.post(`auth/users/${userId}/toggle-follow/`);
  return data;
};

export const completeOnboarding = async (onboardingData) => {
  const { data } = await api.post('auth/onboarding/', onboardingData);
  return data;
};