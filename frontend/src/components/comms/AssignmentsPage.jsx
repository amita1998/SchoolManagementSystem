import { useEffect, useState } from 'react';
import * as comms from '../../services/comms.js';
import { getClasses, getSubjects } from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';

const today = () => new Date().toISOString().slice(0, 10);

/** Date-only parse — never `new Date(iso)`, which shifts a day across timezones. */
function parseDay(value) {
  const [y, m, d] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dueInfo(item) {
  const absolute = item.due_label || '';
  const target = parseDay(item.due_date);
  if (!target) return { rel: 'No due date', absolute, tone: 'later' };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Math.round((target - start) / 86400000);
  if (days < 0) {
    const late = Math.abs(days);
    return { rel: `Overdue · ${late} day${late === 1 ? '' : 's'}`, absolute, tone: 'late' };
  }
  if (days === 0) return { rel: 'Due today', absolute, tone: 'soon' };
  if (days === 1) return { rel: 'Due tomorrow', absolute, tone: 'soon' };
  return { rel: `Due in ${days} days`, absolute, tone: 'later' };
}

export default function AssignmentsPage({ canManage = false }) {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ title: '', description: '', classId: '', subjectId: '', dueDate: today() });
  const [busy, setBusy] = useState(false);

  function load() {
    comms
      .assignments()
      .then(setRows)
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load assignments.' }));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!canManage) return;
    Promise.all([getClasses(), getSubjects()])
      .then(([classList, subjectList]) => {
        setClasses(classList || []);
        setSubjects(subjectList || []);
      })
      .catch(() => {});
  }, [canManage]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await comms.createAssignment({
        ...form,
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
      });
      setNotice({ kind: 'success', text: 'Assignment created.' });
      setForm({ ...form, title: '', description: '' });
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not create the assignment.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    try {
      await comms.deleteAssignment(id);
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not delete.' });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Assignments"
        subtitle={canManage ? 'Assignments for your own classes and subjects. Submission is not part of this release.' : 'Homework set by your teachers. Submission is not part of this release.'}
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {canManage && (
        <section className="section-card">
          <div className="section-card__head">
            <h3>New assignment</h3>
            <span className="muted">Due date drives the reminder on the student dashboard</span>
          </div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="Title" htmlFor="as-title">
                <input id="as-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              </Field>
              <Field label="Due date" htmlFor="as-due">
                <input id="as-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
              </Field>
              <Field label="Class" htmlFor="as-class">
                <select id="as-class" value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })} required>
                  <option value="">…</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Subject" htmlFor="as-subject">
                <select id="as-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>
                  <option value="">…</option>
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description" htmlFor="as-desc" className="form-grid__full">
                <textarea id="as-desc" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Create assignment'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-card__head">
          <h3>{canManage ? 'My assignments' : 'For your class'}</h3>
          <span className="muted">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-journal-text" aria-hidden="true" /></span>
            <strong>No assignments yet</strong>
            <span>{canManage ? 'Set one above and it appears here with its due date.' : 'Homework your teachers set will appear here.'}</span>
          </div>
        ) : (
          <ul className="assignment-list">
            {rows.map((item) => {
              const due = dueInfo(item);
              return (
                <li key={item.id} className="assignment-card">
                  <div className="assignment-card__main">
                    <div className="assignment-card__chips">
                      <span className="comms-chip">
                        <i className="bi bi-mortarboard" aria-hidden="true" />
                        {item.class_name}{item.section_name ? ` ${item.section_name}` : ''}
                      </span>
                      <span className="comms-chip">
                        <i className="bi bi-book" aria-hidden="true" />
                        {item.subject_name}
                      </span>
                      {item.teacher_name && (
                        <span className="comms-chip">
                          <i className="bi bi-person" aria-hidden="true" />
                          {item.teacher_name}
                        </span>
                      )}
                    </div>
                    <h4 className="assignment-card__title">{item.title}</h4>
                    {item.description && <p className="assignment-card__desc">{item.description}</p>}
                  </div>
                  <div className="assignment-card__side">
                    <div className={`due-block due-block--${due.tone}`}>
                      <span className="due-block__label">Due</span>
                      <strong className="due-block__rel">{due.rel}</strong>
                      <span className="due-block__abs">{due.absolute || '—'}</span>
                    </div>
                    {canManage && (
                      <button
                        className="btn-ghost btn--icon comms-icon-btn"
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Delete ${item.title}`}
                        title="Delete assignment"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
