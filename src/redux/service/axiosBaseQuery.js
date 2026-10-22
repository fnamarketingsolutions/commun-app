import apiClient from './apiClient';
import { getToken } from '../../utils/tokenStorage';

const decodeTokenInfo = (rawToken) => {
  try {
    const payloadBase64 = (rawToken || '').split('.')[1];
    if (!payloadBase64) return '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const clean = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = clean.padEnd(clean.length + ((4 - (clean.length % 4)) % 4), '=');
    let str = '';
    for (let i = 0; i < padded.length; i += 4) {
      const e1 = chars.indexOf(padded.charAt(i));
      const e2 = chars.indexOf(padded.charAt(i + 1));
      const e3 = chars.indexOf(padded.charAt(i + 2));
      const e4 = chars.indexOf(padded.charAt(i + 3));
      const c1 = (e1 << 2) | (e2 >> 4);
      const c2 = ((e2 & 15) << 4) | (e3 >> 2);
      const c3 = ((e3 & 3) << 6) | e4;
      str += String.fromCharCode(c1);
      if (e3 !== 64 && e3 !== -1) str += String.fromCharCode(c2);
      if (e4 !== 64 && e4 !== -1) str += String.fromCharCode(c3);
    }
    const payload = JSON.parse(str);
    const expDate = payload.exp ? new Date(payload.exp * 1000) : null;
    const isExpired = expDate ? Date.now() > expDate.getTime() : false;
    return ` | Exp: ${expDate ? expDate.toISOString() : 'None'} (${isExpired ? '⚠️ EXPIRED' : '✅ Active'})`;
  } catch (_) {
    return '';
  }
};

export const axiosBaseQuery = () =>
  async ({ url, method = 'GET', data, params, headers }) => {
    const baseURL = apiClient.defaults.baseURL || '';
    const fullUrl = String(url || '').startsWith('http')
      ? url
      : `${baseURL.replace(/\/+$/, '')}/${String(url || '').replace(/^\/+/, '')}`;

    const token = await getToken();
    const tokenInfo = token ? decodeTokenInfo(token) : '';

    console.log(`\n📡 [MAIN API REQUEST: PROFILE/COMMUNITY] ────────────────────`);
    console.log(`➡️  ${method.toUpperCase()} ${fullUrl}`);
    console.log(`🔑 Auth Token: ${token ? `Present (${token.substring(0, 10)}...${token.slice(-5)})${tokenInfo}` : 'None (No token in storage)'}`);
    if (params) console.log(`🔍 Params:`, JSON.stringify(params));
    if (data) console.log(`📦 Body:`, JSON.stringify(data));

    try {
      const result = await apiClient({
        url,
        method,
        data,
        params,
        headers,
      });

      console.log(`✅ [MAIN API SUCCESS ${result.status}] ${method.toUpperCase()} ${fullUrl}`);
      console.log(`📄 Response Data:`, JSON.stringify(result.data, null, 2));
      console.log(`─────────────────────────────────────────────────────────────\n`);

      return { data: result.data };
    } catch (axiosError) {
      const status = axiosError.response?.status || 'NO_RESPONSE';
      const backendError = axiosError.response?.data || axiosError.message;

      console.log(`❌ [MAIN API ERROR ${status}] ${method.toUpperCase()} ${fullUrl}`);
      console.log(`💥 Backend Error Response:`, JSON.stringify(backendError, null, 2));
      console.log(`─────────────────────────────────────────────────────────────\n`);

      const error = {
        status: axiosError.response?.status ?? null,
        data: backendError,
      };
      return { error };
    }
  };
