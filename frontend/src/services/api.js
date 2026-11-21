import axios from 'axios';
import session from './session.js';

/**
 * Backend base URL. Three spellings are accepted so a hand-edited `.env` cannot silently break
 * every request: VITE_API_URL (canonical), VITE_API_BASE_URL (older name), and the `/api` default
 * that goes through the Vite proxy in development.
 *
 * The value may be given with or without the trailing `/api` — this app calls paths like
 * `/auth/login`, so a bare host would 404 everywhere. It is normalised here, once.
 */
function resolveBaseUrl() {
  const raw =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '/api';
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  if (!trimmed) return '/api';
  if (trimmed.startsWith('/')) return trimmed;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const baseURL = resolveBaseUrl();

/** Shown by the login screen when the browser gets no response at all. */
export const API_BASE_URL = baseURL;

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
