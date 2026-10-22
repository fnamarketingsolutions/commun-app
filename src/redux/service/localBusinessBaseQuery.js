// src/redux/service/localBusinessBaseQuery.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the same base URL as your main API but WITHOUT '/user'
const axiosInstance = axios.create({
  baseURL: 'https://your-api-domain.com/api',  // Replace with your actual base URL
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token exactly like your main axiosBaseQuery does
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token'); // or your token key
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) { }
    return config;
  },
  (error) => Promise.reject(error)
);

export const localBusinessBaseQuery = async ({ url, method = 'GET', body, params }) => {
  const baseURL = axiosInstance.defaults.baseURL || '';
  const fullUrl = `${baseURL.replace(/\/+$/, '')}/${String(url || '').replace(/^\/+/, '')}`;

  console.log(`\n📡 [LOCAL BUSINESS API REQUEST] ─────────────────────────────`);
  console.log(`➡️  ${method.toUpperCase()} ${fullUrl}`);
  if (params) console.log(`🔍 Params:`, JSON.stringify(params));

  try {
    const response = await axiosInstance({
      url,
      method,
      data: body,
      params,
    });

    console.log(`✅ [LOCAL BUSINESS API SUCCESS ${response.status}] ${method.toUpperCase()} ${fullUrl}`);
    console.log(`📄 Response Data:`, JSON.stringify(response.data, null, 2));
    console.log(`─────────────────────────────────────────────────────────────\n`);

    return { data: response.data };
  } catch (error) {
    const status = error.response?.status || 'NO_RESPONSE';
    const backendError = error.response?.data || error.message;

    console.log(`❌ [LOCAL BUSINESS API ERROR ${status}] ${method.toUpperCase()} ${fullUrl}`);
    console.log(`💥 Backend Error Response:`, JSON.stringify(backendError, null, 2));
    console.log(`─────────────────────────────────────────────────────────────\n`);

    return {
      error: {
        status: error.response?.status,
        data: backendError,
      },
    };
  }
};