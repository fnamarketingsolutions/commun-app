import secretaryApiClient from '../service/secretaryApiClient';

export const secretaryAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await secretaryApiClient({
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