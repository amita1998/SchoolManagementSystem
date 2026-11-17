import { useEffect, useState } from 'react';
import * as comms from '../../services/comms.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field, TextArea } from '../../components/forms/Field.jsx';

const AUDIENCES = [
  ['all', 'Everyone'],
  ['classes', 'Selected classes'],
  ['teachers', 'Teachers'],
  ['students', 'Students'],
  ['parents', 'Parents'],
];

export default function NoticesBoard({ role, canManage = false }) {
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ title: '', body: '', type: 'general', status: 'published', audience: 'all' });
  const [busy, setBusy] = useState(false);

  function load() {
    comms
      .announcements()
      .then(setRows)
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load notices.' }));
  }

  useEffect(load, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await comms.createAnnouncement(form);
      setNotice({ kind: 'success', text: form.status === 'published' ? 'Published. Everyone in the audience was notified.' : 'Saved as a draft.' });
      setForm({ ...form, title: '', body: '' });
      load();
    } catch (error) {
      const fields = error.response?.data?.error?.fields;
      setNotice({ kind: 'error', text: fields ? Object.values(fields)[0] : error.response?.data?.error?.message || 'Could not save.' });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    if (role !== 'admin') {
      await comms.markRead(item.id).catch(() => {});
      load();
      return;
    }
    try {
      await comms.setAnnouncementStatus(item.id, item.status === 'published' ? 'archived' : 'published');
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not change the status.' });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Notices"
        subtitle={role === 'admin' ? 'Announcements, circulars and holiday notices. Publishing sends an in-app notification.' : 'Everything the school has published for you.'}
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {canManage && (
        <section className="section-card">
          <div className="section-card__head">
            <h3>New announcement</h3>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Title" htmlFor="an-title">
              <input id="an-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <Field label="Audience" htmlFor="an-audience">
              <select id="an-audience" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
                {AUDIENCES.filter(([value]) => value !== 'classes').map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Type" htmlFor="an-type">
              <select id="an-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                {['general', 'circular', 'holiday', 'exam', 'event'].map((value) => (
                  <option key={value} value={value}>{value.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>
            <Field label="Save as" htmlFor="an-status">
              <select id="an-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="published">Publish now</option>
                <option value="draft">Draft</option>
              </select>
            </Field>
            <TextArea
              label="Message"
              id="an-body"
              className="form-grid__full"
              rows={4}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              required
            />
            <div className="form-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-card__head">
          <h3>{role === 'admin' ? 'All announcements' : 'Published for you'}</h3>
          <span className="muted">{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <p className="empty-state">Nothing published yet.</p>
        ) : (
          <ul className="notice-feed">
            {rows.map((item) => (
              <li key={item.id} className={item.is_read ? 'is-read' : ''}>
                <div className="notice-feed__meta">
                  <span className={`status-badge status-badge--${item.type === 'holiday' ? 'coral' : item.type === 'exam' ? 'purple' : 'blue'}`}>
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className="muted">{item.published_on || 'draft'}</span>
                  {role === 'admin' && <span className="muted">{item.read_count} read</span>}
                  {item.status !== 'published' && <span className="status-badge status-badge--lavender">{item.status}</span>}
                </div>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => toggle(item)}>
                  {role !== 'admin' ? (item.is_read ? 'Mark unread' : 'Mark read') : item.status === 'published' ? 'Archive' : 'Publish'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
