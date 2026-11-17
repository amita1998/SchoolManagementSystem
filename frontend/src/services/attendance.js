import api from './api.js';

export async function mySections() {
  const { data } = await api.get('/attendance/sections');
  return data.data.sections;
}

export async function sheet(params) {
  const { data } = await api.get('/attendance/sheet', { params });
  return data.data;
}

export async function mark(payload) {
  const { data } = await api.post('/attendance/mark', payload);
  return data.data;
}

export async function list(params) {
  const { data } = await api.get('/attendance', { params });
  return data.data;
}

export async function summary(studentId = 'me') {
  const { data } = await api.get(`/attendance/summary/${studentId}`);
  return data.data;
}

export async function corrections(params) {
  const { data } = await api.get('/attendance/corrections', { params });
  return data.data.corrections;
}

export async function requestCorrection(payload) {
  const { data } = await api.post('/attendance/corrections', payload);
  return data.data;
}

export async function reviewCorrection(id, payload) {
  const { data } = await api.post(`/attendance/corrections/${id}/review`, payload);
  return data.data;
}

export default {
  mySections,
  sheet,
  mark,
  list,
  summary,
  corrections,
  requestCorrection,
  reviewCorrection,
};
