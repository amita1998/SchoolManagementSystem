import api from './api.js';

export async function categories() {
  const { data } = await api.get('/fees/categories');
  return data.data.categories;
}

export async function createCategory(payload) {
  const { data } = await api.post('/fees/categories', payload);
  return data.data;
}

export async function structures() {
  const { data } = await api.get('/fees/structures');
  return data.data.structures;
}

export async function createStructure(payload) {
  const { data } = await api.post('/fees/structures', payload);
  return data.data;
}

/** Class-wise setup: one category + plan, one amount per class. */
export async function bulkStructures(payload) {
  const { data } = await api.post('/fees/structures/bulk', payload);
  return data.data.results;
}

export async function removeStructure(id) {
  const { data } = await api.delete(`/fees/structures/${id}`);
  return data.data;
}

export async function assign(payload) {
  const { data } = await api.post('/fees/assign', payload);
  return data.data;
}

export async function overview() {
  const { data } = await api.get('/fees/overview');
  return data.data;
}

export async function payments(params = {}) {
  const { data } = await api.get('/fees/payments', { params });
  return data.data;
}

export async function recordPayment(payload) {
  const { data } = await api.post('/fees/payments', payload);
  return data.data;
}

export async function reversePayment(id, reason) {
  const { data } = await api.post(`/fees/payments/${id}/reverse`, { reason });
  return data.data;
}

export async function summary(studentId) {
  const { data } = await api.get(`/fees/summary/${studentId}`);
  return data.data;
}
