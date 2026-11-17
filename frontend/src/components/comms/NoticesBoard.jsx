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

const TYPE_TONE = { holiday: 'coral', exam: 'purple', event: 'mint', circular: 'amber' };

const AUDIENCE_LABEL = {
  all: 'Everyone',
  classes: 'Selected classes',
  teachers: 'Teachers',
  students: 'Students',
  parents: 'Parents',
};

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

  async function remove(id) {
    try {
      await comms.deleteAnnouncement(id);
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not delete.' });
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
            <span className="muted">Drafts stay private until you publish</span>
          </div>
          <form onSubmit={submit}>
            <div className="form-grid">
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
              <div className="form-grid__full">
                <TextArea
                  label="Message"
                  id="an-body"
                  rows={4}
                  value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : form.status === 'published' ? 'Publish notice' : 'Save draft'}
              </button>
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
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-megaphone" aria-hidden="true" /></span>
            <strong>Nothing published yet</strong>
            <span>{role === 'admin' ? 'Notices you publish will be listed here.' : 'New notices from the school will land here.'}</span>
          </div>
        ) : (
          <ul className="notice-feed">
            {rows.map((item) => (
              <li key={item.id} className={`notice-feed__item ${item.is_read ? 'is-read' : ''}`}>
                <div className="notice-feed__top">
                  <span className={`status-badge status-badge--${TYPE_TONE[item.type] || 'blue'}`}>
                    {item.type.replace('_', ' ')}
                  </span>
                  <span className="comms-chip">
                    <i className="bi bi-people" aria-hidden="true" />
                    {AUDIENCE_LABEL[item.audience] || item.audience}
                  </span>
                  {role === 'admin' ? (
                    <span className="comms-chip">
                      <i className="bi bi-eye" aria-hidden="true" />
                      {item.read_count} read
                    </span>
                  ) : (
                    <span className="comms-chip">
                      <i className={`bi ${item.is_read ? 'bi-check2-all' : 'bi-dot'}`} aria-hidden="true" />
                      {item.is_read ? 'Read' : 'Unread'}
                    </span>
                  )}
                  <span className="notice-feed__spacer" />
                  {item.status !== 'published' && <span className="status-badge status-badge--lavender">{item.status}</span>}
                </div>
                <h4 className="notice-feed__title">{item.title}</h4>
                <p className="notice-feed__body">{item.body}</p>
                <div className="notice-feed__foot">
                  <span className="notice-feed__stamp">
                    {item.published_on ? `Published ${item.published_on}` : 'Not published'}
                  </span>
                  <div className="notice-feed__actions">
                    {role === 'admin' && item.status === 'published' && (
                      <button className="btn-ghost btn--sm" type="button" onClick={() => toggle(item)}>
                        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Withdraw
                      </button>
                    )}
                    {role === 'admin' && item.status !== 'published' && (
                      <button className="btn-ghost btn--sm" type="button" onClick={() => toggle(item)}>
                        <i className="bi bi-send" aria-hidden="true" /> Publish
                      </button>
                    )}
                    {role !== 'admin' && (
                      <button className="btn-ghost btn--sm" type="button" onClick={() => toggle(item)}>
                        <i className={`bi ${item.is_read ? 'bi-envelope' : 'bi-envelope-open'}`} aria-hidden="true" />
                        {item.is_read ? 'Mark unread' : 'Mark read'}
                      </button>
                    )}
                    {canManage && (
                      <button
                        className="btn-ghost btn--icon comms-icon-btn"
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Delete ${item.title}`}
                        title="Delete notice"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
