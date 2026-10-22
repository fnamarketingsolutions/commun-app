import apiClient from './apiClient';

export const axiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await apiClient({
        url,
        method,
        data,
        params,
        headers,
      });
      return { data: result.data };
    } catch (axiosError) {
      const error = {
        status: axiosError.response?.status ?? null,
        data: axiosError.response?.data || axiosError.message,
      };
      return { error };
    }
  };
