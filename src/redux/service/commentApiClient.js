import axios from 'axios';
import Config from 'react-native-config';
import { saveToken, getToken } from '../../utils/tokenStorage';

// Config.API_BASE_URL = "http://10.0.2.2:3001/api/user"
// Comment/review routes live under "/api/comments" on the same server.
const deriveCommentBaseUrl = (userBaseUrl) => {
  if (!userBaseUrl) return userBaseUrl;
  return userBaseUrl.replace(/\/api\/user\/?$/, '/api/comments');
};

const commentApiClient = axios.create({
  baseURL: deriveCommentBaseUrl(Config.API_BASE_URL),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


// ── Request interceptor: attach JWT cookie ────────────────────────────────────
commentApiClient.interceptors.request.use(
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

// ── Response interceptor: persist refreshed JWT cookie ───────────────────────
commentApiClient.interceptors.response.use(
  async (response) => {
    try {
      const rawSetCookie = response.headers['set-cookie'];
      if (rawSetCookie) {
        const cookieStr = Array.isArray(rawSetCookie)
          ? rawSetCookie.join('; ')
          : rawSetCookie;
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

export default commentApiClient;