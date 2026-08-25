import axios from 'axios';
import Config from 'react-native-config';
import { getToken, saveToken } from '../../utils/tokenStorage';

// Root base URL (remove /api/user suffix)
const rootBaseUrl = Config.API_BASE_URL.replace(/\/api\/user\/?$/, '');

const rootApiClient = axios.create({
  baseURL: rootBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ──────────────────────────────────────
rootApiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers['Cookie'] = `jwt=${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor (sync token) ──────────────────────
rootApiClient.interceptors.response.use(
  async (response) => {
    const rawSetCookie = response.headers['set-cookie'];
    if (rawSetCookie) {
      const cookieStr = Array.isArray(rawSetCookie) ? rawSetCookie.join('; ') : rawSetCookie;
      const match = cookieStr.match(/jwt=([^;,\s]+)/);
      if (match?.[1]) {
        await saveToken(match[1]);
      }
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const rootAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await rootApiClient({
        url,
        method,
        data,
        params,
        headers,
      });
      return { data: result.data };
    } catch (axiosError) {
      return {
        error: {
          status: axiosError.response?.status,
          data: axiosError.response?.data || axiosError.message,
        },
      };
    }
  };