// src/redux/service/providerAxiosBaseQuery.js
import providerApiClient from '../service/providerApiClient';

export const providerAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await providerApiClient({
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