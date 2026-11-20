import { api } from './api.js';

/**
 * Fetches the PDF with the auth header (a plain link click cannot carry the token) and hands it
 * to the browser as a download. Nothing is stored on the server.
 */
export async function downloadIdCard(kind, id, filename) {
  const { data } = await api.get(`/id-cards/${kind}/${id}`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `id-card-${kind}-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default { downloadIdCard };
