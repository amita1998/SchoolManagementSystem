import api from './api.js';

export async function settings() {
  const { data } = await api.get('/admin/settings');
  return data.data;
}

export async function saveSettings(payload) {
  const { data } = await api.put('/admin/settings', payload);
  return data.data;
}

export async function audit(params = {}) {
  const { data } = await api.get('/admin/audit', { params });
  return data.data;
}

const REPORT_PATHS = {
  students: '/admin/reports/students',
  attendance: '/admin/reports/attendance',
  results: '/admin/reports/results',
  fees: '/admin/reports/fees',
};

export async function report(name, params = {}) {
  const { data } = await api.get(REPORT_PATHS[name], { params });
  return data.data;
}

/** Downloads a CSV through the authenticated axios client (a plain <a> would lose the token). */
export async function downloadReport(name, params = {}) {
  const response = await api.get(REPORT_PATHS[name], { params: { ...params, format: 'csv' }, responseType: 'blob' });
  // Local date, not toISOString(): until 05:30 IST the UTC date is still yesterday.
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vvs-${name}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
