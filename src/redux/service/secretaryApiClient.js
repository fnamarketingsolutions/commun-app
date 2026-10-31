// src/services/secretaryApiClient.js
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import Config from 'react-native-config';
import { saveToken, getToken } from '../../utils/tokenStorage';

const DEFAULT_SECRETARY_URL = 'https://api.commun.in/api/secretary';

// Secretary routes live under "/api/secretary" on the same server.
const deriveSecretaryBaseUrl = (userBaseUrl) => {
  if (!userBaseUrl) return DEFAULT_SECRETARY_URL;
  const base = String(userBaseUrl).replace(/\/+$/, '');
  if (/\/api\/secretary$/i.test(base)) return base;
  if (/\/api\/user$/i.test(base)) return base.replace(/\/api\/user$/i, '/api/secretary');
  if (/\/api$/i.test(base)) return `${base}/secretary`;
  return `${base}/api/secretary`;
};

const secretaryApiClient = axios.create({
  baseURL: deriveSecretaryBaseUrl(Config.API_BASE_URL),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

secretaryApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        if (Platform.OS === 'ios' && NativeModules.CommunCookies?.setJwt) {
          await NativeModules.CommunCookies.setJwt(token);
        }
        config.headers['Cookie'] = `jwt=${token}`;
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {
      // Never block the request if storage read fails
    }
    return config;
  },
  (error) => Promise.reject(error),
);

secretaryApiClient.interceptors.response.use(
  async (response) => {
    try {
      const rawSetCookie =
        response.headers['set-cookie'] ||
        response.headers['Set-Cookie'] ||
        (typeof response.headers?.get === 'function' ? response.headers.get('set-cookie') : null);

      if (rawSetCookie) {
        const cookieStr = Array.isArray(rawSetCookie)
          ? rawSetCookie.join('; ')
          : String(rawSetCookie);
        const match = cookieStr.match(/jwt=([^;,\s]+)/);
        if (match?.[1]) {
          await saveToken(match[1]);
        }
      }
      if (response.data?.token || response.data?.jwt) {
        await saveToken(response.data?.token || response.data?.jwt);
      }
    } catch (_) {
      // Never block the response if storage write fails
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default secretaryApiClient;
