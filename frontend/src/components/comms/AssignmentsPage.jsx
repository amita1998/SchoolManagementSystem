import { useEffect, useState } from 'react';
import * as comms from '../../services/comms.js';
import { getClasses, getSubjects } from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';

const today = () => new Date().toISOString().slice(0, 10);

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
          </div>
          <form className="form-grid" onSubmit={submit}>
            <Field label="Title" htmlFor="as-title">
              <input id="as-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
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
            <Field label="Due date" htmlFor="as-due">
              <input id="as-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
            </Field>
            <Field label="Description" htmlFor="as-desc" className="form-grid__full">
              <textarea id="as-desc" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>
            <div className="form-actions">
              <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create assignment'}</button>
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
          <p className="empty-state">No assignments yet.</p>
        ) : (
          <ul className="card-list">
            {rows.map((item) => (
              <li key={item.id}>
                <div>
                  <h4>{item.title}</h4>
                  {item.description && <p>{item.description}</p>}
                  <span className="muted">
                    {item.class_name} {item.section_name || ''} · {item.subject_name} · due {item.due_label}
                    {item.teacher_name ? ` · ${item.teacher_name}` : ''}
                  </span>
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
