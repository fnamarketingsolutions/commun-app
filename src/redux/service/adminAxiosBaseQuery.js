// src/redux/service/adminAxiosBaseQuery.js
import adminApiClient from '../service/adminApiClient';

export const adminAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await adminApiClient({
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