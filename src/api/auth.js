/**
 * src/api/auth.js
 * Clean, Fixed & Complete Auth API
 */
import api from './client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ════════════════════════════════════════════════════════════════════════════
// LOGIN WITH OTP
// ════════════════════════════════════════════════════════════════════════════
export const sendLoginOTP = async (username, password) => {
  const { data } = await api.post('auth/login/otp/', { username, password });
  return data;
};

export const sendOTP = async (identifier, purpose = 'login') => {
  const { data } = await api.post('auth/otp/send/', {
    email: identifier,
    purpose
  });
  return data;
};

export const verifyOTP = async (identifier, otp, purpose = 'login') => {
  const { data } = await api.post('auth/otp/verify/', {
    identifier,
    otp,
    purpose
  });
  return data;
};

// Aliases for LoginOTPScreen
export const resendLoginOTP = (identifier) => sendOTP(identifier, 'login');
export const verifyLoginOTP = (identifier, otp) => verifyOTP(identifier, otp, 'login');

// ════════════════════════════════════════════════════════════════════════════
// DIRECT LOGIN (Legacy)
// ════════════════════════════════════════════════════════════════════════════
export const loginUser = async (username, password) => {
  const { data } = await api.post('auth/login/', { username, password });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════════════════
export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await api.post('auth/register/', {
    username,
    email,
    password1,
    password2
  });
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
    const idToken = userInfo?.data?.idToken;

    if (!idToken) throw new Error('Google sign-in did not return an ID token.');

    const { data } = await api.post('auth/social/google/', { id_token: idToken });

    console.log('✅ FULL GOOGLE BACKEND RESPONSE:', JSON.stringify(data, null, 2));

    const token = data.access || data.key;
    if (!token) throw new Error('No token received from server');

    await AsyncStorage.multiSet([
      ['access', token],
      ['refresh', data.refresh || ''],
      ['user', JSON.stringify(data.user || {})],
    ]);

    return {
      key: token,
      access: data.access,
      refresh: data.refresh,
      user: data.user,
      isNewUser: data.is_new_user ?? false,
    };
  } catch (error) {
    console.error('❌ Google Login Error:', error);
    throw error;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TOKEN REFRESH (NEW)
// ════════════════════════════════════════════════════════════════════════════
export const refreshToken = async () => {
  try {
    const refresh = await AsyncStorage.getItem('refresh');

    if (!refresh) {
      console.warn('⚠️ No refresh token found in storage');
      throw new Error('No refresh token available');
    }

    const { data } = await api.post('auth/token/refresh/', { refresh });

    // Save new access token
    await AsyncStorage.setItem('access', data.access);

    // Some backends return a new refresh token (rotation)
    if (data.refresh) {
      await AsyncStorage.setItem('refresh', data.refresh);
      console.log('✅ New refresh token saved');
    }

    console.log('✅ Token refreshed successfully');
    return data.access;   // Return the new access token
  } catch (error) {
    console.error('❌ Token Refresh Failed:', error.response?.data || error.message);

    // Clear invalid tokens
    await AsyncStorage.multiRemove(['access', 'refresh']);

    throw error;   // Let the interceptor handle logout
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
    const { data } = await api.post('auth/logout-custom/');
    await AsyncStorage.multiRemove(['access', 'refresh', 'user']);
    return data;
  } catch (error) {
    await AsyncStorage.multiRemove(['access', 'refresh', 'user']);
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