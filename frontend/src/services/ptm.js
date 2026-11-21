import { api } from './api.js';

export async function getSlots(params = {}) {
  const { data } = await api.get('/ptm/slots', { params });
  return data.data;
}

export async function createSlot(payload) {
  const { data } = await api.post('/ptm/slots', payload);
  return data.data.slot;
}

export async function updateSlot(id, payload) {
  const { data } = await api.put(`/ptm/slots/${id}`, payload);
  return data.data.slot;
}

export async function deleteSlot(id) {
  const { data } = await api.delete(`/ptm/slots/${id}`);
  return data.data;
}

export async function getBookings(params = {}) {
  const { data } = await api.get('/ptm/bookings', { params });
  return data.data;
}

export async function bookSlot(slotId, payload) {
  const { data } = await api.post(`/ptm/slots/${slotId}/book`, payload);
  return data.data.booking;
}

export async function decideBooking(id, payload) {
  const { data } = await api.post(`/ptm/bookings/${id}/decision`, payload);
  return data.data.booking;
}

export async function cancelBooking(id) {
  const { data } = await api.post(`/ptm/bookings/${id}/cancel`);
  return data.data.booking;
}

export default {
  getSlots, createSlot, updateSlot, deleteSlot, getBookings, bookSlot, decideBooking, cancelBooking,
};
