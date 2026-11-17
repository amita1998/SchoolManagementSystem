import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

/**
 * Fetches the signed-in role's dashboard payload. `childId` re-fetches when a parent
 * switches children; the server re-checks that the child belongs to the account.
 */
export function useDashboard(role, { childId } = {}) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: current.data ? 'refreshing' : 'loading', error: null }));
    try {
      const { data } = await api.get(`/dashboard/${role}`, {
        params: childId ? { childId } : undefined,
      });
      setState({ status: 'ready', data: data.data, error: null });
    } catch (error) {
      const payload = error.response?.data?.error;
      setState({
        status: 'error',
        data: null,
        error: payload?.message || 'Could not load your dashboard.',
      });
    }
  }, [role, childId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export default useDashboard;
