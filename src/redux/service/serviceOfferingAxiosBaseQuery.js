// src/redux/service/serviceOfferingAxiosBaseQuery.js
import serviceOfferingApiClient from '../service/serviceOfferingApiClient';

export const serviceOfferingAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await serviceOfferingApiClient({
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