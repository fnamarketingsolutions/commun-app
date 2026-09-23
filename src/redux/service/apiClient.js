// src/services/apiClient.js
import axios from 'axios';
import Config from 'react-native-config';
import { saveToken, getToken, clearToken } from '../../utils/tokenStorage';


const resolveUserApiBaseUrl = (raw) => {
  const base = String(raw || '').replace(/\/+$/, '');
  if (!base || /\/api\/user$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return `${base}/user`;
  return base;
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
        config.headers['Cookie'] = `jwt=${token}`;
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

      // set-cookie header contains the raw JWT on login/register/any token refresh
      const rawSetCookie = response.headers['set-cookie'];
      if (rawSetCookie) {
        const cookieStr = Array.isArray(rawSetCookie)
          ? rawSetCookie.join('; ')
          : rawSetCookie;

        // Extract just the jwt value (stops at ; , or whitespace)
        const match = cookieStr.match(/jwt=([^;,\s]+)/);
        if (match?.[1]) {
          await saveToken(match[1]);
        }
      }
    } catch (_) {
      // Never block the response if storage write fails
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default apiClient;