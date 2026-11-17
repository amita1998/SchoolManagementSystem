import api from './api.js';

export async function periods() {
  const { data } = await api.get('/timetable/periods');
  return data.data.periods;
}

export async function createPeriod(payload) {
  const { data } = await api.post('/timetable/periods', payload);
  return data.data;
}

export async function removePeriod(id) {
  const { data } = await api.delete(`/timetable/periods/${id}`);
  return data.data;
}

export async function mine() {
  const { data } = await api.get('/timetable/mine');
  return data.data;
}

export async function forSection(sectionId) {
  const { data } = await api.get(`/timetable/sections/${sectionId}`);
  return data.data;
}

export async function saveSlot(payload) {
  const { data } = await api.post('/timetable/slots', payload);
  return data.data;
}

export async function removeSlot(id) {
  const { data } = await api.delete(`/timetable/slots/${id}`);
  return data.data;
}
