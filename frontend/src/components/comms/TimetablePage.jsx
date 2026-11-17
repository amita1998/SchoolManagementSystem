import { useCallback, useEffect, useState } from 'react';
import * as timetableApi from '../../services/timetable.js';
import { getClasses, getSubjects, listTeachers } from '../../services/admin.js';
import TimetableGrid from '../../components/comms/TimetableGrid.jsx';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import { Field } from '../../components/forms/Field.jsx';

const DAYS = [
  [1, 'Monday'],
  [2, 'Tuesday'],
  [3, 'Wednesday'],
  [4, 'Thursday'],
  [5, 'Friday'],
  [6, 'Saturday'],
];

export default function TimetablePage({ canManage = false }) {
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ dayOfWeek: '1', periodId: '', subjectId: '', teacherId: '', room: '' });

  const loadMine = useCallback(() => {
    timetableApi
      .mine()
      .then(setData)
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the timetable.' }));
  }, []);

  useEffect(() => {
    if (canManage) return;
    loadMine();
  }, [canManage, loadMine]);

  useEffect(() => {
    if (!canManage) return;
    Promise.all([getClasses(), getSubjects(), listTeachers({ limit: 100 })])
      .then(([classList, subjectList, teacherList]) => {
        // getClasses()/getSubjects() return arrays; listTeachers() is paged, so it returns { rows, meta }.
        setClasses(classList || []);
        setSubjects(subjectList || []);
        setTeachers(teacherList.rows || []);
      })
      .catch(() => setNotice({ kind: 'error', text: 'Could not load classes, subjects or teachers.' }));
  }, [canManage]);

  function pickClass(event) {
    const id = event.target.value;
    const found = classes.find((item) => String(item.id) === id);
    setSections(found?.sections || []);
    setSectionId('');
    setData(null);
  }

  function loadSection(id) {
    setSectionId(id);
    if (!id) return setData(null);
    timetableApi
      .forSection(id)
      .then(setData)
      .catch((error) => setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load that section.' }));
  }

  async function addSlot(event) {
    event.preventDefault();
    try {
      await timetableApi.saveSlot({
        sectionId: Number(sectionId),
        dayOfWeek: Number(form.dayOfWeek),
        periodId: Number(form.periodId),
        subjectId: Number(form.subjectId),
        teacherId: Number(form.teacherId),
        room: form.room || null,
      });
      setNotice({ kind: 'success', text: 'Period saved.' });
      loadSection(sectionId);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save that period.' });
    }
  }

  async function removeSlot(id) {
    try {
      await timetableApi.removeSlot(id);
      loadSection(sectionId);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove that period.' });
    }
  }

  const heading = data?.section ? `${data.section.class_name} ${data.section.section_name}` : canManage ? 'Section timetable' : 'My week';
  const slotCount = data?.slots?.length || 0;

  return (
    <div className="page">
      <PageHeader
        title="Timetable"
        subtitle={canManage ? 'A teacher cannot be booked in two classrooms in the same period — the database enforces it.' : 'Your weekly schedule.'}
      />
      {notice.text && <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>}

      {canManage && (
        <section className="section-card tt-toolbar">
          <div className="tt-toolbar__group">
            <div className="tt-field">
              <label className="tt-field__label" htmlFor="tt-class">Class</label>
              <select id="tt-class" className="tt-select" defaultValue="" onChange={pickClass}>
                <option value="">Class…</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="tt-field">
              <label className="tt-field__label" htmlFor="tt-section">Section</label>
              <select id="tt-section" className="tt-select" value={sectionId} onChange={(event) => loadSection(event.target.value)} disabled={!sections.length}>
                <option value="">Section…</option>
                {sections.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
          <span className="tt-toolbar__meta">
            {data ? `${slotCount} period${slotCount === 1 ? '' : 's'} booked` : canManage ? 'No section selected' : ''}
          </span>
        </section>
      )}

      <section className="section-card">
        <div className="section-card__head">
          <h3>{heading}</h3>
          {data && <span className="muted">{data.periods?.filter((period) => !period.is_break).length || 0} periods a day · Mon–Sat</span>}
        </div>
        {!data ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-calendar-week" aria-hidden="true" /></span>
            <strong>{canManage ? 'Pick a class and section' : 'Loading…'}</strong>
            <span>{canManage ? 'Choose a section in the toolbar above to see and edit its week.' : 'Your timetable is on its way.'}</span>
          </div>
        ) : (
          <TimetableGrid data={data} onRemove={canManage ? removeSlot : undefined} />
        )}
      </section>

      {canManage && data && (
        <section className="section-card tt-add">
          <div className="section-card__head">
            <h3>Add a period</h3>
            <span className="muted">
              Booking into a taken slot replaces it · clashes are refused by the database
            </span>
          </div>
          <form onSubmit={addSlot}>
            <div className="tt-add__grid">
              <Field label="Day" htmlFor="tt-day">
                <select id="tt-day" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}>
                  {DAYS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Period" htmlFor="tt-period">
                <select id="tt-period" value={form.periodId} onChange={(event) => setForm({ ...form, periodId: event.target.value })} required>
                  <option value="">…</option>
                  {data.periods.filter((period) => !period.is_break).map((period) => (
                    <option key={period.id} value={period.id}>{period.label} ({period.start_time})</option>
                  ))}
                </select>
              </Field>
              <Field label="Subject" htmlFor="tt-subject">
                <select id="tt-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>
                  <option value="">…</option>
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Teacher" htmlFor="tt-teacher">
                <select id="tt-teacher" value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} required>
                  <option value="">…</option>
                  {teachers.map((item) => (
                    <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Room" htmlFor="tt-room">
                <input id="tt-room" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} />
              </Field>
            </div>
            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={!form.periodId || !form.subjectId || !form.teacherId}>
                Save period
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
