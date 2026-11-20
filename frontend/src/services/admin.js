import api from './api.js';

// ---------- students ----------
export async function listStudents(params) {
  const { data } = await api.get('/students', { params });
  return data.data;
}

export async function getStudent(id) {
  const { data } = await api.get(`/students/${id}`);
  return data.data;
}

export async function createStudent(payload, files = []) {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  form.append('documentTypes', JSON.stringify(files.map((item) => item.docType)));
  files.forEach((item) => form.append('documents', item.file));
  const { data } = await api.post('/students', form);
  return data.data;
}

export async function updateStudent(id, payload) {
  const { data } = await api.put(`/students/${id}`, payload);
  return data.data;
}

export async function changeStudentStatus(id, payload) {
  const { data } = await api.post(`/students/${id}/status`, payload);
  return data.data;
}

export async function resetStudentPassword(id) {
  const { data } = await api.post(`/students/${id}/reset-password`);
  return data.data;
}

export async function resetGuardianPassword(studentId, parentId) {
  const { data } = await api.post(`/students/${studentId}/guardians/${parentId}/reset-password`);
  return data.data;
}

export async function deleteStudent(id) {
  const { data } = await api.delete(`/students/${id}`);
  return data.data;
}

export async function addStudentDocuments(id, files = []) {
  const form = new FormData();
  form.append('documentTypes', JSON.stringify(files.map((item) => item.docType)));
  files.forEach((item) => form.append('documents', item.file));
  const { data } = await api.post(`/students/${id}/documents`, form);
  return data.data;
}

export function documentUrl(documentId) {
  return `/api/students/documents/${documentId}`;
}

// ---------- teachers ----------
export async function listTeachers(params) {
  const { data } = await api.get('/teachers', { params });
  return data.data;
}

export async function getTeacher(id) {
  const { data } = await api.get(`/teachers/${id}`);
  return data.data;
}

/** The signed-in teacher's own record, classes and subjects (no id in the URL). */
export async function getMyClasses() {
  const { data } = await api.get('/teachers/me');
  return data.data;
}

export async function createTeacher(payload) {
  const { data } = await api.post('/teachers', payload);
  return data.data;
}

export async function updateTeacher(id, payload) {
  const { data } = await api.put(`/teachers/${id}`, payload);
  return data.data;
}

export async function changeTeacherStatus(id, status) {
  const { data } = await api.post(`/teachers/${id}/status`, { status });
  return data.data;
}

export async function setTeacherAssignments(id, items) {
  const { data } = await api.put(`/teachers/${id}/assignments`, { items });
  return data.data;
}

export async function assignClassTeacher(id, payload) {
  const { data } = await api.post(`/teachers/${id}/class-teacher`, payload);
  return data.data;
}

export async function clearClassTeacher(id) {
  const { data } = await api.delete(`/teachers/${id}/class-teacher`);
  return data.data;
}

export async function resetTeacherPassword(id) {
  const { data } = await api.post(`/teachers/${id}/reset-password`);
  return data.data;
}

export async function deleteTeacher(id) {
  const { data } = await api.delete(`/teachers/${id}`);
  return data.data;
}

// ---------- academics ----------
export async function getOptions() {
  const { data } = await api.get('/academics/options');
  return data.data;
}

export async function getClasses() {
  const { data } = await api.get('/academics/classes');
  return data.data.classes;
}

export async function createClass(payload) {
  const { data } = await api.post('/academics/classes', payload);
  return data.data;
}

export async function updateClass(id, payload) {
  const { data } = await api.put(`/academics/classes/${id}`, payload);
  return data.data;
}

export async function deleteClass(id) {
  const { data } = await api.delete(`/academics/classes/${id}`);
  return data.data;
}

export async function createSection(classId, payload) {
  const { data } = await api.post(`/academics/classes/${classId}/sections`, payload);
  return data.data;
}

export async function updateSection(id, payload) {
  const { data } = await api.put(`/academics/sections/${id}`, payload);
  return data.data;
}

export async function deleteSection(id) {
  const { data } = await api.delete(`/academics/sections/${id}`);
  return data.data;
}

export async function getSubjects() {
  const { data } = await api.get('/academics/subjects');
  return data.data.subjects;
}

export async function createSubject(payload) {
  const { data } = await api.post('/academics/subjects', payload);
  return data.data;
}

export async function deleteSubject(id) {
  const { data } = await api.delete(`/academics/subjects/${id}`);
  return data.data;
}

/** Class 11/12 read their list per stream; every other class passes nothing. */
export async function getClassSubjects(id, streamId = null) {
  const { data } = await api.get(`/academics/classes/${id}/subjects`, {
    params: streamId ? { streamId } : {},
  });
  return data.data.subjects;
}

export async function setClassSubjects(id, subjectIds, streamId = null) {
  const { data } = await api.put(`/academics/classes/${id}/subjects`, {
    subjectIds,
    ...(streamId ? { streamId } : {}),
  });
  return data.data.subjects;
}

export async function getYears() {
  const { data } = await api.get('/academics/years');
  return data.data.years;
}

export async function createYear(payload) {
  const { data } = await api.post('/academics/years', payload);
  return data.data;
}

export async function setCurrentYear(id) {
  const { data } = await api.post(`/academics/years/${id}/current`);
  return data.data;
}

export default {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  changeStudentStatus,
  resetStudentPassword,
  resetGuardianPassword,
  deleteStudent,
  addStudentDocuments,
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  changeTeacherStatus,
  setTeacherAssignments,
  assignClassTeacher,
  clearClassTeacher,
  resetTeacherPassword,
  deleteTeacher,
  getOptions,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  createSection,
  updateSection,
  deleteSection,
  getSubjects,
  createSubject,
  deleteSubject,
  getClassSubjects,
  setClassSubjects,
  getYears,
  createYear,
  setCurrentYear,
};
