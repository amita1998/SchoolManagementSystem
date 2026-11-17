import api from './api.js';

export async function login({ identifier, password, rememberMe }) {
  const { data } = await api.post('/auth/login', { identifier, password, rememberMe });
  return data.data;
}

export async function refreshSession() {
  const { data } = await api.post('/auth/refresh');
  return data.data;
}

export async function logout() {
  const { data } = await api.post('/auth/logout');
  return data.data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function changePassword(payload) {
  const { data } = await api.post('/auth/change-password', payload);
  return data.data;
}

export async function listSessions() {
  const { data } = await api.get('/auth/sessions');
  return data.data.sessions;
}

export default { login, refreshSession, logout, fetchMe, changePassword, listSessions };
