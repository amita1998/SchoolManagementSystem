import { api } from './api.js';

export async function getTypes() {
  const { data } = await api.get('/leave/types');
  return data.data.types;
}

export async function getRequests(params = {}) {
  const { data } = await api.get('/leave/requests', { params });
  return data.data;
}

export async function getBalance(params = {}) {
  const { data } = await api.get('/leave/balance', { params });
  return data.data.rows;
}

export async function applyLeave(payload) {
  const { data } = await api.post('/leave/requests', payload);
  return data.data.request;
}

export async function decideLeave(id, payload) {
  const { data } = await api.post(`/leave/requests/${id}/decide`, payload);
  return data.data.request;
}

export async function cancelLeave(id) {
  const { data } = await api.post(`/leave/requests/${id}/cancel`);
  return data.data.request;
}

export default { getTypes, getRequests, getBalance, applyLeave, decideLeave, cancelLeave };
