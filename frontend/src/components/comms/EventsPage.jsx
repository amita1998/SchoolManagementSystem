import { useEffect, useState } from 'react';
import * as comms from '../../services/comms.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';
import { getClasses } from '../../services/admin.js';

const CATEGORY_TONE = { holiday: 'coral', exam: 'purple', sports: 'blue' };

export default function EventsPage({ canManage = false }) {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ title: '', description: '', eventDate: '', startTime: '', endTime: '', location: '', audience: 'all', publish: true });
  const [busy, setBusy] = useState(false);

  function load() {
    comms
      .events()
      .then(setRows)
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load events.' }));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!canManage) return;
    getClasses()
      .then((payload) => setClasses(payload.classes || payload || []))
      .catch(() => {});
  }, [canManage]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await comms.createEvent({ ...form, startTime: form.startTime || null, endTime: form.endTime || null });
      setNotice({ kind: 'success', text: form.publish ? 'Event published.' : 'Event saved as a draft.' });
      setForm({ ...form, title: '', description: '', eventDate: '', location: '' });
      load();
    } catch (error) {
      const fields = error.response?.data?.error?.fields;
      setNotice({ kind: 'error', text: fields ? Object.values(fields)[0] : error.response?.data?.error?.message || 'Could not save the event.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await comms.deleteEvent(id);
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not delete.' });
    }
  }

  return (
    <div className="page">
      <PageHeader title="Events" subtitle="School calendar items for the audiences you are allowed to see." />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {canManage && (
        <section className="section-card">
          <div className="section-card__head">
            <h3>New event</h3>
          </div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Title" htmlFor="ev-title">
              <input id="ev-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <Field label="Date" htmlFor="ev-date">
              <input id="ev-date" type="date" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} required />
            </Field>
            <Field label="Starts" htmlFor="ev-start">
              <input id="ev-start" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            </Field>
            <Field label="Ends" htmlFor="ev-end">
              <input id="ev-end" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </Field>
            <Field label="Audience" htmlFor="ev-audience">
              <select id="ev-audience" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
                <option value="all">Everyone</option>
                <option value="teachers">Teachers</option>
                <option value="students">Students</option>
                <option value="parents">Parents</option>
              </select>
            </Field>
            <Field label="Location" htmlFor="ev-place">
              <input id="ev-place" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </Field>
            <Field label="Description" htmlFor="ev-desc" className="form-grid__full">
              <textarea id="ev-desc" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>
            <div className="form-actions">
              <label className="check">
                <input type="checkbox" checked={form.publish} onChange={(event) => setForm({ ...form, publish: event.target.checked })} /> Publish immediately
              </label>
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create event'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-card__head">
          <h3>Calendar</h3>
          <span className="muted">{rows.length} event{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? (
          <p className="empty-state">No events yet.</p>
        ) : (
          <ul className="timeline">
            {rows.map((item) => (
              <li key={item.id}>
                <div className="timeline__date">
                  <strong>{item.date_label}</strong>
                  <span>{item.start_time ? `${item.start_time}${item.end_time ? `–${item.end_time}` : ''}` : 'All day'}</span>
                </div>
                <div className="timeline__body">
                  <h4>
                    {item.title}
                    {item.category && (
                      <span className={`status-badge status-badge--${CATEGORY_TONE[item.category.toLowerCase()] || 'lavender'}`}>{item.category}</span>
                    )}
                    {!item.is_published && <span className="status-badge status-badge--lavender">draft</span>}
                  </h4>
                  {item.description && <p>{item.description}</p>}
                  <span className="muted">{item.location ? `${item.location} · ` : ''}{item.audience}</span>
                </div>
                {canManage && (
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => remove(item.id)}>
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
