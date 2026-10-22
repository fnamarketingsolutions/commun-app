
import bannerApiClient from '../service/bannerApiClient';

export const bannerAxiosBaseQuery = () =>
  async ({ url, method = 'GET', data, params, headers }) => {
    const baseURL = bannerApiClient.defaults.baseURL || '';
    const fullUrl = `${baseURL.replace(/\/+$/, '')}/${String(url || '').replace(/^\/+/, '')}`;

    console.log(`\n📡 [BANNER API REQUEST] ─────────────────────────────────────`);
    console.log(`➡️  ${method.toUpperCase()} ${fullUrl}`);
    if (params) console.log(`🔍 Params:`, JSON.stringify(params));

    try {
      const result = await bannerApiClient({
        url,
        method,
        data,
        params,
        headers,
      });

      console.log(`✅ [BANNER API SUCCESS ${result.status}] ${method.toUpperCase()} ${fullUrl}`);
      console.log(`📄 Response Data:`, JSON.stringify(result.data, null, 2));
      console.log(`─────────────────────────────────────────────────────────────\n`);

      return { data: result.data };
    } catch (axiosError) {
      const status = axiosError.response?.status || 'NO_RESPONSE';
      const backendError = axiosError.response?.data || axiosError.message;

      console.log(`❌ [BANNER API ERROR ${status}] ${method.toUpperCase()} ${fullUrl}`);
      console.log(`💥 Backend Error Response:`, JSON.stringify(backendError, null, 2));
      console.log(`─────────────────────────────────────────────────────────────\n`);

      return {
        error: {
          status: axiosError.response?.status,
          data: backendError,
        },
      };
    }
  };