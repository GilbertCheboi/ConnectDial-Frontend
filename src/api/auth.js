/**
 * src/api/auth.js
 * Integrated & Optimized Version
 */

import api from './client';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ── SESSION PERSISTENCE ──────────────────────────────────────────────
 * Uses the API client's token management while maintaining AsyncStorage
 * for backward compatibility and user data.
 */
const persistSession = async (key, user) => {
  // Update the API client's internal state (SecureStore + Axios Headers)
  if (api.setTokens) {
    await api.setTokens(key, null);
  }

  // Maintain the legacy AsyncStorage keys
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
  const { data } = await api.post('auth/otp/verify/', {
    identifier,
    otp,
    purpose,
  });
  if (purpose === 'login' && data.key) {
    await persistSession(data.key, data.user);
  }
  return data;
};

export const resendLoginOTP = identifier => sendOTP(identifier, 'login');
export const verifyLoginOTP = (identifier, otp) =>
  verifyOTP(identifier, otp, 'login');

// REGISTER
export const registerUser = async ({
  username,
  email,
  password1,
  password2,
}) => {
  const { data } = await api.post('auth/register/', {
    username,
    email,
    password1,
    password2,
  });
  if (data.token || data.key) {
    await persistSession(data.token || data.key, data.user);
  }
  return data;
};

// ── GOOGLE ───────────────────────────────────────────────────────────────────

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId:
      '597689072930-lf6o7j50lqv8ro2qc4lluq06gribo16h.apps.googleusercontent.com',
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
};

export const googleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    try {
      await GoogleSignin.signOut();
    } catch (_) {}

    const userInfo = await GoogleSignin.signIn();

    // Support for multiple library versions (v6-v13+)
    let idToken = null;
    if (userInfo?.type === 'success') {
      idToken = userInfo.data?.idToken;
    } else if (userInfo?.idToken) {
      idToken = userInfo.idToken;
    } else if (userInfo?.data?.idToken) {
      idToken = userInfo.data.idToken;
    }

    if (!idToken) {
      throw new Error('No idToken received from Google.');
    }

    const { data } = await api.post('auth/social/google/', {
      id_token: idToken,
    });

    if (!data.key) {
      throw new Error('Backend did not return auth token.');
    }

    await persistSession(data.key, data.user);
    return {
      token: data.key,
      user: data.user,
      isNewUser: data.is_new_user ?? false,
    };
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw error;
    }
    throw error;
  }
};

// PASSWORD
export const requestPasswordReset = async email => {
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
  if (data.key) await persistSession(data.key, data.user);
  return data;
};

// EMAIL VERIFICATION
export const sendEmailVerification = async () => {
  const { data } = await api.post('auth/email/send-verification/');
  return data;
};

export const verifyEmail = async otp => {
  const { data } = await api.post('auth/email/verify/', { otp });
  if (data.key) await persistSession(data.key, data.user);
  return data;
};

// 2FA
export const setup2FA = async () => {
  const { data } = await api.post('auth/2fa/setup/');
  return data;
};

export const verify2FASetup = async totpCode => {
  const { data } = await api.post('auth/2fa/verify-setup/', {
    totp_code: totpCode,
  });
  if (data.key) await persistSession(data.key, data.user);
  return data;
};

export const validate2FA = async totpCode => {
  const { data } = await api.post('auth/2fa/validate/', {
    totp_code: totpCode,
  });
  return data;
};

export const disable2FA = async totpCode => {
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
    console.warn('Server logout failed:', error.message);
  } finally {
    // Clear tokens from the API client (SecureStore)
    if (api.clearTokens) {
      await api.clearTokens();
    }
    // Clear local app data
    await AsyncStorage.multiRemove(['authToken', 'user_data', 'is_new_user']);
    try {
      await GoogleSignin.signOut();
    } catch (_) {}
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

export const searchProfiles = async query => {
  const { data } = await api.get('auth/search/', { params: { search: query } });
  return data;
};

export const toggleFollow = async userId => {
  const { data } = await api.post(`auth/users/${userId}/toggle-follow/`);
  return data;
};

export const completeOnboarding = async onboardingData => {
  const { data } = await api.post('auth/onboarding/', onboardingData);
  return data;
};
