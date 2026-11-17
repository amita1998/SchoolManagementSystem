import api from './api.js';

export async function listExams() {
  const { data } = await api.get('/exams');
  return data.data.exams;
}

export async function getExam(id) {
  const { data } = await api.get(`/exams/${id}`);
  return data.data;
}

export async function createExam(payload) {
  const { data } = await api.post('/exams', payload);
  return data.data;
}

export async function addSchedule(examId, payload) {
  const { data } = await api.post(`/exams/${examId}/schedules`, payload);
  return data.data;
}

export async function removeSchedule(examId, scheduleId) {
  const { data } = await api.delete(`/exams/${examId}/schedules/${scheduleId}`);
  return data.data;
}

export async function publish(examId, publishValue) {
  const { data } = await api.post(`/exams/${examId}/publish`, { publish: publishValue });
  return data.data;
}

export async function myPapers() {
  const { data } = await api.get('/exams/mine');
  return data.data.papers;
}

export async function marksSheet(scheduleId) {
  const { data } = await api.get(`/exams/marks/${scheduleId}`);
  return data.data;
}

export async function saveMarks(scheduleId, payload) {
  const { data } = await api.put(`/exams/marks/${scheduleId}`, payload);
  return data.data;
}

export async function unlockMarks(scheduleId, reason) {
  const { data } = await api.post(`/exams/marks/${scheduleId}/unlock`, { reason });
  return data.data;
}

export async function overrideMark(scheduleId, payload) {
  const { data } = await api.post(`/exams/marks/${scheduleId}/override`, payload);
  return data.data;
}

export async function studentExams(studentId = 'me') {
  const { data } = await api.get(`/exams/results/student/${studentId}/exams`);
  return data.data.exams;
}

export async function reportCard(studentId, examId) {
  const { data } = await api.get(`/exams/results/student/${studentId}`, { params: { examId } });
  return data.data;
}

export async function classResults(examId, classId) {
  const { data } = await api.get(`/exams/results/class/${classId}/exam/${examId}`);
  return data.data.results;
}

export default {
  listExams,
  getExam,
  createExam,
  addSchedule,
  removeSchedule,
  publish,
  myPapers,
  marksSheet,
  saveMarks,
  unlockMarks,
  overrideMark,
  studentExams,
  reportCard,
  classResults,
};
