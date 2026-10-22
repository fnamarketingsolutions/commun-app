// src/utils/tokenStorage.js
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JWT_KEY = 'commun_jwt_token';

/**
 * Save JWT to Android Keystore / iOS Keychain with AsyncStorage fallback.
 * Called automatically by apiClient's response interceptor on login/register.
 */
export const saveToken = async (token) => {
  if (!token) return;

  try {
    await EncryptedStorage.setItem(JWT_KEY, token);
  } catch (_) {
    // AsyncStorage below still keeps the session if the keychain write fails.
  }

  try {
    await AsyncStorage.setItem(JWT_KEY, token);
  } catch (_) {}
};

/**
 * Read the stored JWT.
 * Tries EncryptedStorage first, falls back to AsyncStorage.
 */
export const getToken = async () => {
  try {
    const token = await EncryptedStorage.getItem(JWT_KEY);
    if (token) {
      return token;
    }
  } catch (_) {}

  try {
    const fallbackToken = await AsyncStorage.getItem(JWT_KEY);
    if (fallbackToken) return fallbackToken;
  } catch (_) {}

  return null;
};

/**
 * Delete the stored JWT from both storages.
 */
export const clearToken = async () => {
  try {
    await EncryptedStorage.removeItem(JWT_KEY);
  } catch (_) {
    // Missing keychain item is normal when the session lived only in AsyncStorage.
  }
  try {
    await AsyncStorage.removeItem(JWT_KEY);
  } catch (_) {}
};