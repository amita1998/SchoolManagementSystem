import { api } from './api.js';

// catalogue
export async function getBooks(params = {}) {
  const { data } = await api.get('/library/books', { params });
  return data.data;
}

export async function createBook(payload) {
  const { data } = await api.post('/library/books', payload);
  return data.data.book;
}

export async function updateBook(id, payload) {
  const { data } = await api.put(`/library/books/${id}`, payload);
  return data.data.book;
}

export async function deleteBook(id) {
  const { data } = await api.delete(`/library/books/${id}`);
  return data.data;
}

// circulation
export async function getIssues(params = {}) {
  const { data } = await api.get('/library/issues', { params });
  return data.data;
}

export async function issueBook(payload) {
  const { data } = await api.post('/library/issues', payload);
  return data.data.issue;
}

export async function returnBook(id, payload = {}) {
  const { data } = await api.post(`/library/issues/${id}/return`, payload);
  return data.data.issue;
}

/** Student/teacher: own loans. Parent: one child at a time (`childId`). */
export async function getMyBooks(params = {}) {
  const { data } = await api.get('/library/me', { params });
  return data.data.rows;
}

export default {
  getBooks,
  createBook,
  updateBook,
  deleteBook,
  getIssues,
  issueBook,
  returnBook,
  getMyBooks,
};
