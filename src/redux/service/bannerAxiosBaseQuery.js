// src/redux/service/bannerAxiosBaseQuery.js

import bannerApiClient from '../service/bannerApiClient';

export const bannerAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await bannerApiClient({
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