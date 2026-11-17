import axios from 'axios';
import session from './session.js';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = session.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshInFlight = null;

/**
 * One silent retry after an expired access token. The refresh call itself is never
 * retried, and concurrent 401s share a single refresh request.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || !config || config._retried || config.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }
    const code = response.data?.error?.code;
    if (response.status !== 401) {
      if (code === 'SESSION_REVOKED' || code === 'SESSION_EXPIRED') session.expire();
      return Promise.reject(error);
    }
    if (code !== 'TOKEN_EXPIRED') {
      session.expire();
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      refreshInFlight =
        refreshInFlight ||
        api
          .post('/auth/refresh')
          .then(({ data }) => {
            session.set(data.data.accessToken);
            return data.data;
          })
          .finally(() => {
            refreshInFlight = null;
          });
      await refreshInFlight;
      return api(config);
    } catch (refreshError) {
      session.expire();
      return Promise.reject(error);
    }
  },
);

export default api;
