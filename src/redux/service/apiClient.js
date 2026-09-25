// src/services/apiClient.js
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import Config from 'react-native-config';
import { saveToken, getToken, clearToken } from '../../utils/tokenStorage';


const resolveUserApiBaseUrl = (raw) => {
  const base = String(raw || '').replace(/\/+$/, '');
  if (!base || /\/api\/user$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/user`;
  return base;
};

const jwtFromCookieString = (cookieStr) => {
  const match = String(cookieStr || '').match(/jwt=([^;,\s]+)/);
  return match?.[1] || null;
};

const readNativeJwt = async () => {
  if (Platform.OS !== 'ios' || !NativeModules.CommunCookies?.getAll) return null;
  try {
    const header = await NativeModules.CommunCookies.getAll();
    return jwtFromCookieString(header);
  } catch (_) {
    return null;
  }
};

const apiClient = axios.create({
  baseURL: resolveUserApiBaseUrl(Config.API_BASE_URL),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
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

apiClient.interceptors.response.use(
  async (response) => {
    try {
      const url = response.config?.url || '';

      if (url.includes('/logout')) {
        // Backend expired the cookie; mirror that locally
        await clearToken();
        return response;
      }

      // Check all possible header forms (AxiosHeaders.get, set-cookie, Set-Cookie)
      const rawSetCookie =
        response.headers['set-cookie'] ||
        response.headers['Set-Cookie'] ||
        (typeof response.headers?.get === 'function' ? response.headers.get('set-cookie') : null);

      let jwt = null;
      if (rawSetCookie) {
        const cookieStr = Array.isArray(rawSetCookie)
          ? rawSetCookie.join('; ')
          : String(rawSetCookie);
        jwt = jwtFromCookieString(cookieStr);
      }
      if (!jwt) jwt = await readNativeJwt();
      if (!jwt && (response.data?.token || response.data?.jwt)) {
        jwt = response.data?.token || response.data?.jwt;
      }
      if (jwt) await saveToken(jwt);
    } catch (_) {
      // Never block the response if storage write fails
    }
    return response;
  },
  async (error) => {
    try {
      const status = error.response?.status;
      const code = error.response?.data?.code;
      if (status === 401 && (code === 'JWT_INVALID' || code === 'UNAUTHORIZED' || error.response?.data?.message?.includes('Invalid session'))) {
        console.log(`\n🚨 [AUTH EXPIRY DETECTED] Backend returned 401 (${code || 'UNAUTHORIZED'}). Clearing expired token from storage...`);
        await clearToken();
      }
    } catch (_) { }
    return Promise.reject(error);
  },
);

export default apiClient;