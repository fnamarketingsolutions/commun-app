// src/redux/service/bannerApiClient.js

import axios from 'axios';
import Config from 'react-native-config';
import { saveToken, getToken } from '../../utils/tokenStorage';

// Banner routes live under "/api/banners"
const deriveBannerBaseUrl = (userBaseUrl) => {
  if (!userBaseUrl) return userBaseUrl;
  return userBaseUrl.replace(/\/api\/user\/?$/, '/api/banners');
};

const bannerApiClient = axios.create({
  baseURL: deriveBannerBaseUrl(Config.API_BASE_URL),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});


bannerApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers['Cookie'] = `jwt=${token}`;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

bannerApiClient.interceptors.response.use(
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
    } catch (_) {}
    return response;
  },
  (error) => Promise.reject(error)
);

export default bannerApiClient;