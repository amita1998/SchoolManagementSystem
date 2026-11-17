import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import session from '../services/session.js';
import authService from '../services/auth.js';

const AuthContext = createContext(null);

const ANONYMOUS = { status: 'anonymous', user: null, permissions: [] };

/**
 * Module scope on purpose: React 18 StrictMode runs mount effects twice, and two
 * concurrent refreshes would rotate the token twice (the second one replays a
 * consumed token, which the server treats as theft and kills the family).
 * One promise is shared by every mount of the provider.
 */
let bootstrapRequest = null;
function bootstrapSession() {
  if (!bootstrapRequest) bootstrapRequest = authService.refreshSession();
  return bootstrapRequest;
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, permissions: [] });

  const applySession = useCallback((data) => {
    session.set(data.accessToken);
    setState({
      status: 'authenticated',
      user: data.user,
      permissions: data.permissions || [],
    });
  }, []);

  const clearSession = useCallback(() => {
    session.clear();
    setState(ANONYMOUS);
  }, []);

  // Restore the session from the httpOnly refresh cookie on first paint.
  useEffect(() => {
    let cancelled = false;
    bootstrapSession()
      .then((data) => {
        if (!cancelled) applySession(data);
      })
      .catch(() => {
        if (!cancelled) setState(ANONYMOUS);
      });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  // A refresh that fails inside the axios interceptor drops us back to anonymous.
  useEffect(() => {
    session.onExpired(clearSession);
  }, [clearSession]);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      applySession(data);
      return data;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const data = await authService.fetchMe();
    setState((current) => ({
      ...current,
      status: 'authenticated',
      user: data.user,
      permissions: data.permissions,
    }));
    return data;
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true;
      if (state.permissions.includes('*')) return true;
      return state.permissions.includes(permission);
    },
    [state.permissions],
  );

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshUser,
      clearSession,
      hasPermission,
    }),
    [state, login, logout, refreshUser, clearSession, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

export default AuthContext;
