// src/services/apiClient.js
import axios from 'axios';
import Config from 'react-native-config';
import { saveToken, getToken, clearToken } from '../../utils/tokenStorage';

const apiClient = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
// ── REQUEST interceptor ───────────────────────────────────────────────────────
// React Native's networking layer does NOT persist httpOnly cookies across
// app restarts (unlike a browser). We manually read the JWT from
// EncryptedStorage and attach it as a Cookie header on every outgoing request.
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

// ── RESPONSE interceptor ─────────────────────────────────────────────────────
// • Login / register → backend sends set-cookie with the JWT → we save it
// • Logout           → backend clears the cookie → we clear EncryptedStorage
// This keeps EncryptedStorage perfectly in sync with the backend session.
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