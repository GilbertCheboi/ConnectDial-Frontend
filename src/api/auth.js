import api from './client';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ════════════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════════════

export const loginUser = async (username, password) => {
  const { data } = await api.post('auth/login/', { username, password });
  return data; // returns { key, user }
};

// ════════════════════════════════════════════════════════════════════════════
// REGISTER
// ════════════════════════════════════════════════════════════════════════════

export const registerUser = async ({ username, email, password1, password2 }) => {
  const { data } = await api.post('auth/register/', { username, email, password1, password2 });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// OTP — Generic (used for login OTP flow)
// View: SendOTPView   → POST /auth/otp/send/    body: { email, purpose }
// View: VerifyOTPView → POST /auth/otp/verify/  body: { identifier, otp, purpose }
// ════════════════════════════════════════════════════════════════════════════

export const sendOTP = async (email, purpose = 'login') => {
  const { data } = await api.post('auth/otp/send/', { email, purpose });
  return data; // { detail: "If that email exists, an OTP has been sent." }
};

export const verifyOTP = async (identifier, otp, purpose = 'login') => {
  const { data } = await api.post('auth/otp/verify/', { identifier, otp, purpose });
  return data; // { detail, key, user }
};

// Aliases used by LoginOTPScreen
export const resendLoginOTP = (email) => sendOTP(email, 'login');
export const verifyLoginOTP = (identifier, otp) => verifyOTP(identifier, otp, 'login');

// ════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// View: ForgotPasswordView → POST /auth/password/forgot/  body: { email }
// View: VerifyOTPView      → POST /auth/otp/verify/       body: { identifier, otp, purpose }
//                                                          returns: { reset_token }
// View: ResetPasswordView  → POST /auth/password/reset/   body: { reset_token, new_password }
//
// Flow:
//   Step 1 — requestPasswordReset(email)          → OTP sent to inbox
//   Step 2 — verifyResetOTP(identifier, otp)      → returns reset_token (scoped JWT)
//   Step 3 — resetPassword(resetToken, newPassword) → password updated
// ════════════════════════════════════════════════════════════════════════════

// FIX 1: Field renamed from `identifier` to `email` — ForgotPasswordView
// only reads request.data.get("email"). Sending `identifier` caused a silent
// 400 because the backend always got None.
export const requestPasswordReset = async (email) => {
  const { data } = await api.post('auth/password/forgot/', { email });
  return data; // { detail: "If that email exists, a reset OTP has been sent." }
};

// FIX 2: Added `purpose: 'password_reset'` — VerifyOTPView defaults to
// purpose='login' if not sent, so it was querying OTPCode with the wrong
// purpose and always returning "Invalid or expired OTP."
export const verifyResetOTP = async (identifier, otp) => {
  const { data } = await api.post('auth/otp/verify/', {
    identifier,
    otp,
    purpose: 'password_reset',
  });
  return data.reset_token; // scoped JWT valid for 15 minutes
};

// FIX 3: Signature changed from (email, otp, newPassword) to (resetToken, newPassword)
// and body updated to { reset_token, new_password } to match the updated
// ResetPasswordView which no longer accepts email+otp — it only accepts the
// scoped JWT issued by verifyResetOTP.
export const resetPassword = async (resetToken, newPassword) => {
  const { data } = await api.post('auth/password/reset/', {
    reset_token: resetToken,
    new_password: newPassword,
  });
  return data; // { detail: "Password has been reset successfully." }
};

// ════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD (authenticated)
// View: ChangePasswordView → POST /auth/password/change/
// body: { old_password, new_password }
// returns: { detail, key }  ← new token is issued
// ════════════════════════════════════════════════════════════════════════════

export const changePassword = async (oldPassword, newPassword) => {
  const { data } = await api.post('auth/password/change/', {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION (authenticated)
// View: SendEmailVerificationView → POST /auth/email/send-verification/
// View: VerifyEmailView           → POST /auth/email/verify/  body: { otp }
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
// ⚠️  All 2FA endpoints expect "totp_code", NOT "otp"
// View: Setup2FAView       → POST /auth/2fa/setup/        body: (none)
// View: Verify2FASetupView → POST /auth/2fa/verify-setup/ body: { totp_code }
// View: Validate2FAView    → POST /auth/2fa/validate/     body: { totp_code }
// View: Disable2FAView     → POST /auth/2fa/disable/      body: { totp_code }
// View: Get2FAStatusView   → GET  /auth/2fa/status/
// ════════════════════════════════════════════════════════════════════════════

export const setup2FA = async () => {
  const { data } = await api.post('auth/2fa/setup/');
  return data; // { secret, qr_code, detail }
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
  return data; // { two_fa_enabled, email_verified }
};

// ════════════════════════════════════════════════════════════════════════════
// TOKEN CHECK
// View: CheckTokenView → GET /auth/token/check/
// ════════════════════════════════════════════════════════════════════════════

export const checkToken = async () => {
  const { data } = await api.get('auth/token/check/');
  return data; // { valid: true, user }
};

// ════════════════════════════════════════════════════════════════════════════
// GOOGLE SIGN-IN
// View: GoogleSignInView → POST /auth/social/google/  body: { id_token }
// returns: { access, refresh, user, is_new_user }
// ════════════════════════════════════════════════════════════════════════════

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '849401797302-h2a3b2jhvru6fthok0rbb9b66mamhcce.apps.googleusercontent.com',
    offlineAccess: true,
  });
};

export const saveSession = async ({ access, refresh, user }) => {
  await AsyncStorage.multiSet([
    ['access',  access],
    ['refresh', refresh],
    ['user',    JSON.stringify(user)],
  ]);
  return user;
};

export const googleLogin = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut();

  const userInfo = await GoogleSignin.signIn();

  let idToken = null;
  if (userInfo?.type === 'success') {
    idToken = userInfo.data?.idToken;
  } else {
    throw new Error('Google sign-in was cancelled or failed.');
  }

  if (!idToken) throw new Error('Google sign-in did not return an ID token.');

  const { data } = await api.post('auth/social/google/', { id_token: idToken });
  await saveSession(data);

  return {
    access:    data.access,
    refresh:   data.refresh,
    user:      data.user,
    isNewUser: data.is_new_user ?? false,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// LOGOUT
// View: LogoutView → POST /auth/logout-custom/
// ════════════════════════════════════════════════════════════════════════════

export const logoutUser = async () => {
  const { data } = await api.post('auth/logout-custom/');
  return data;
};

// ════════════════════════════════════════════════════════════════════════════
// PROFILE & SOCIAL
// View: UserProfileUpdateView → GET/PATCH /auth/update/  ?user_id= or ?username=
// View: ProfileListView       → GET /auth/search/        ?search=
// View: ToggleFollowView      → POST /auth/users/{id}/toggle-follow/
// View: OnboardingView        → POST /auth/onboarding/
// ════════════════════════════════════════════════════════════════════════════

export const getProfile = async (params = {}) => {
  // params: { user_id } or { username } or empty for own profile
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
  return data; // { following, message, follower_count }
};

export const completeOnboarding = async (onboardingData) => {
  const { data } = await api.post('auth/onboarding/', onboardingData);
  return data;
};