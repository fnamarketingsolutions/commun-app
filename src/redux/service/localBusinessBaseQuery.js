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
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

export const localBusinessBaseQuery = async ({ url, method, body, params }) => {
  try {
    const response = await axiosInstance({
      url,
      method,
      data: body,
      params,
    });
    return { data: response.data };
  } catch (error) {
    return {
      error: {
        status: error.response?.status,
        data: error.response?.data || error.message,
      },
    };
  }
};