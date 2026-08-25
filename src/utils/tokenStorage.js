// src/utils/tokenStorage.js
import EncryptedStorage from 'react-native-encrypted-storage';

const JWT_KEY = 'commun_jwt_token';

/**
 * Save JWT to Android Keystore / iOS Keychain.
 * Called automatically by apiClient's response interceptor on login/register.
 */
export const saveToken = async (token) => {
  try {
    await EncryptedStorage.setItem(JWT_KEY, token);
  } catch (e) {
    console.warn('[tokenStorage] saveToken failed:', e?.message);
  }
};

/**
 * Read the stored JWT.
 * Called by apiClient's request interceptor to attach Cookie header,
 * and by SplashScreen to decide whether to call checkAuth.
 */
export const getToken = async () => {
  try {
    return await EncryptedStorage.getItem(JWT_KEY);
  } catch (e) {
    return null;
  }
};

/**
 * Delete the stored JWT.
 * Called by apiClient's response interceptor on logout,
 * and by SplashScreen when checkAuth returns 401 (expired/invalid token).
 */
export const clearToken = async () => {
  try {
    await EncryptedStorage.removeItem(JWT_KEY);
  } catch (e) {
    console.warn('[tokenStorage] clearToken failed:', e?.message);
  }
};