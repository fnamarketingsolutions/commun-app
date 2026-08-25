import commentApiClient from '../service/commentApiClient';

export const commentAxiosBaseQuery = () =>
  async ({ url, method, data, params, headers }) => {
    try {
      const result = await commentApiClient({
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