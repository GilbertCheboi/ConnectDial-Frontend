/**
 * src/api/auth.js
 * Clean, Fixed & Complete Auth API — DRF Token Auth
 */
import api from './client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ════════════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════════════

export const loginUser = async (username, password) => {
  const { data } = await api.post('auth/login/', { username, password });
  // data → { key: "...", user: {...} }
  await AsyncStorage.setItem('authToken', data.key);
  await AsyncStorage.setItem('user_data', JSON.stringify(data.user || {}));
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// LOGIN WITH OTP
// ════════════════════════════════════════════════════════════════════════════

export const sendOTP = async (identifier, purpose = 'login') => {
  const { data } = await api.post('auth/otp/send/', {
    email: identifier,
    purpose,
  });
  return data;
};

export const verifyOTP = async (identifier, otp, purpose = 'login') => {
  const { data } = await api.post('auth/otp/verify/', {
    identifier,
    otp,
    purpose,
  });

  // If it's a login OTP, persist the token immediately
  if (purpose === 'login' && data.key) {
    await AsyncStorage.setItem('authToken', data.key);
    await AsyncStorage.setItem('user_data', JSON.stringify(data.user || {}));
  }

  return data;
};

// Aliases for LoginOTPScreen
export const resendLoginOTP  = (identifier)       => sendOTP(identifier, 'login');
export const verifyLoginOTP  = (identifier, otp)  => verifyOTP(identifier, otp, 'login');

// ════════════════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════════════════

export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await api.post('auth/register/', {
    username,
    email,
    password1,
    password2,
  });
  // RegisterView returns { ..., token: "..." }
  if (data.token) {
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('user_data', JSON.stringify(data || {}));
  }
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE SIGN-IN
// ════════════════════════════════════════════════════════════════════════════

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut();

    const userInfo = await GoogleSignin.signIn();
    const idToken  = userInfo?.data?.idToken;

    if (!idToken) throw new Error('Google sign-in did not return an ID token.');

    const { data } = await api.post('auth/social/google/', { id_token: idToken });

    console.log('✅ FULL GOOGLE BACKEND RESPONSE:', JSON.stringify(data, null, 2));

    // Backend now returns { key, user, is_new_user } — no more data.token fallback
    if (!data.key) throw new Error('No token received from server.');

    await AsyncStorage.setItem('authToken', data.key);
    await AsyncStorage.setItem('user_data', JSON.stringify(data.user || {}));

    return {
      token:     data.key,
      user:      data.user,
      isNewUser: data.is_new_user ?? false,
    };
  } catch (error) {
    console.error('❌ Google Login Error:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════════════════════

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
  // data → { reset_token: "..." }
  return data.reset_token;
};

export const resetPassword = async (resetToken, newPassword) => {
  const { data } = await api.post('auth/password/reset/', {
    reset_token: resetToken,
    new_password: newPassword,
  });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ════════════════════════════════════════════════════════════════════════════

export const changePassword = async (oldPassword, newPassword) => {
  const { data } = await api.post('auth/password/change/', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  // Backend rotates the token on password change — update stored token
  if (data.key) {
    await AsyncStorage.setItem('authToken', data.key);
  }
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ════════════════════════════════════════════════════════════════════════════

export const sendEmailVerification = async () => {
  const { data } = await api.post('auth/email/send-verification/');
  return data;
};

export const verifyEmail = async (otp) => {
  const { data } = await api.post('auth/email/verify/', { otp });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// 2FA — TOTP
// ════════════════════════════════════════════════════════════════════════════

export const setup2FA = async () => {
  const { data } = await api.post('auth/2fa/setup/');
  return data;
};

export const verify2FASetup = async (totpCode) => {
  const { data } = await api.post('auth/2fa/verify-setup/', { totp_code: totpCode });
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

// ════════════════════════════════════════════════════════════════════════════
// TOKEN CHECK
// ════════════════════════════════════════════════════════════════════════════

export const checkToken = async () => {
  const { data } = await api.get('auth/token/check/');
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════════════════════════════════════════

export const logoutUser = async () => {
  try {
    const { data } = await api.post('auth/logout/');
    await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
    return data;
  } catch (error) {
    // Always clear local storage even if the server call fails
    await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE & SOCIAL
// ════════════════════════════════════════════════════════════════════════════

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