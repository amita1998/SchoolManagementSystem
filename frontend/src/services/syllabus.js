import { api } from './api.js';

export async function getPairs() {
  const { data } = await api.get('/syllabus/pairs');
  return data.data.rows;
}

export async function getChapters(params = {}) {
  const { data } = await api.get('/syllabus/chapters', { params });
  return data.data;
}

export async function createChapter(payload) {
  const { data } = await api.post('/syllabus/chapters', payload);
  return data.data.chapter;
}

export async function updateChapter(id, payload) {
  const { data } = await api.put(`/syllabus/chapters/${id}`, payload);
  return data.data.chapter;
}

export async function deleteChapter(id) {
  const { data } = await api.delete(`/syllabus/chapters/${id}`);
  return data.data;
}

export async function getPortions(params = {}) {
  const { data } = await api.get('/syllabus/portions', { params });
  return data.data;
}

export async function setPortion(scheduleId, chapterIds) {
  const { data } = await api.put(`/syllabus/schedules/${scheduleId}/portion`, { chapterIds });
  return data.data;
}

export default {
  getPairs, getChapters, createChapter, updateChapter, deleteChapter, getPortions, setPortion,
};
