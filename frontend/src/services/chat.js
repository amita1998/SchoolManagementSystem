import { api } from './api.js';

export async function getThreads() {
  const { data } = await api.get('/chat/threads');
  return data.data;
}

export async function getUnread() {
  const { data } = await api.get('/chat/unread');
  return data.data;
}

export async function getContacts(params = {}) {
  const { data } = await api.get('/chat/contacts', { params });
  return data.data;
}

export async function startThread(payload) {
  const { data } = await api.post('/chat/threads', payload);
  return data.data;
}

export async function getMessages(threadId, params = {}) {
  const { data } = await api.get(`/chat/threads/${threadId}/messages`, { params });
  return data.data;
}

export async function sendMessage(threadId, body) {
  const { data } = await api.post(`/chat/threads/${threadId}/messages`, { body });
  return data.data.message;
}

export async function markRead(threadId) {
  const { data } = await api.post(`/chat/threads/${threadId}/read`);
  return data.data;
}

export default {
  getThreads, getUnread, getContacts, startThread, getMessages, sendMessage, markRead,
};
