/**
 * Access token lives in memory only (never localStorage): an XSS that can read
 * localStorage would otherwise walk away with a usable token.
 * Persistence across reloads comes from the httpOnly refresh cookie.
 */
let accessToken = null;
let expiredHandler = () => {};

export const session = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token || null;
  },
  clear: () => {
    accessToken = null;
  },
  onExpired: (handler) => {
    expiredHandler = handler;
  },
  expire: () => {
    accessToken = null;
    expiredHandler();
  },
};

export default session;
