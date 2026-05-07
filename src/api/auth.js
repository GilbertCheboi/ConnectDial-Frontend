/**
 * src/api/auth.js
 */
import api from './client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistSession = async (key, user) => {
  await AsyncStorage.multiSet([
    ['authToken', key],
    ['user_data', JSON.stringify(user || {})],
  ]);
};

// ── LOGIN ────────────────────────────────────────────────────────────────────

export const loginUser = async (username, password) => {
  const { data } = await api.post('auth/login/', { username, password });
  await persistSession(data.key, data.user);
  return data;
};

// ── OTP ─────────────────────────────────────────────────────────────────────

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

// ── REGISTER ─────────────────────────────────────────────────────────────────

export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await api.post('auth/register/', { username, email, password1, password2 });
  if (data.token) {
    await persistSession(data.token, data.user); // ✅ data.user not data
  }
  return data;
};

// ── GOOGLE ───────────────────────────────────────────────────────────────────

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
    const idToken = userInfo?.data?.idToken;
    if (!idToken) throw new Error('Google sign-in did not return an ID token.');

    const { data } = await api.post('auth/social/google/', { id_token: idToken });
    if (!data.key) throw new Error('No token received from server.');

    await persistSession(data.key, data.user);
    return { token: data.key, user: data.user, isNewUser: data.is_new_user ?? false };
  } catch (error) {
    console.error('❌ Google Login Error:', error);
    throw error;
  }
};

// ── PASSWORD ─────────────────────────────────────────────────────────────────

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

// ── EMAIL VERIFICATION ───────────────────────────────────────────────────────

export const sendEmailVerification = async () => {
  const { data } = await api.post('auth/email/send-verification/');
  return data;
};

export const verifyEmail = async (otp) => {
  const { data } = await api.post('auth/email/verify/', { otp });
  if (data.key) await AsyncStorage.setItem('authToken', data.key); // ✅ added
  return data;
};

// ── 2FA ──────────────────────────────────────────────────────────────────────

export const setup2FA = async () => {
  const { data } = await api.post('auth/2fa/setup/');
  return data;
};

export const verify2FASetup = async (totpCode) => {
  const { data } = await api.post('auth/2fa/verify-setup/', { totp_code: totpCode });
  if (data.key) await AsyncStorage.setItem('authToken', data.key); // ✅ added
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

// ── TOKEN ────────────────────────────────────────────────────────────────────

export const checkToken = async () => {
  const { data } = await api.get('auth/token/check/');
  return data;
};

// ── LOGOUT ───────────────────────────────────────────────────────────────────

export const logoutUser = async () => {
  try {
    await api.post('auth/logout/');
  } catch (error) {
    console.warn('Server logout failed (clearing local session anyway):', error.message);
  } finally {
    await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']); // ✅ always runs
  }
};

// ── PROFILE & SOCIAL ─────────────────────────────────────────────────────────

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