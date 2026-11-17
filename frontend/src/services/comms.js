import api from './api.js';

// events
export async function events() {
  const { data } = await api.get('/comms/events');
  return data.data.events;
}

export async function createEvent(payload) {
  const { data } = await api.post('/comms/events', payload);
  return data.data;
}

export async function deleteEvent(id) {
  const { data } = await api.delete(`/comms/events/${id}`);
  return data.data;
}

// announcements
export async function announcements() {
  const { data } = await api.get('/comms/announcements');
  return data.data.announcements;
}

export async function createAnnouncement(payload) {
  const { data } = await api.post('/comms/announcements', payload);
  return data.data;
}

export async function setAnnouncementStatus(id, status) {
  const { data } = await api.post(`/comms/announcements/${id}/status`, { status });
  return data.data;
}

export async function deleteAnnouncement(id) {
  const { data } = await api.delete(`/comms/announcements/${id}`);
  return data.data;
}

export async function markRead(id) {
  const { data } = await api.post(`/comms/announcements/${id}/read`);
  return data.data;
}

// notifications
export async function notifications(params = {}) {
  const { data } = await api.get('/comms/notifications', { params });
  return data.data;
}

export async function markNotification(id, read = true) {
  const { data } = await api.post(`/comms/notifications/${id}/read`, { read });
  return data.data;
}

// assignments
export async function assignments() {
  const { data } = await api.get('/comms/assignments');
  return data.data.assignments;
}

export async function createAssignment(payload) {
  const { data } = await api.post('/comms/assignments', payload);
  return data.data;
}

export async function deleteAssignment(id) {
  const { data } = await api.delete(`/comms/assignments/${id}`);
  return data.data;
}
