import { useCallback, useEffect, useState } from 'react';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

const TABS = ['Classes', 'Subjects', 'Academic years'];

export default function AcademicsPage() {
  const [tab, setTab] = useState('Classes');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [newClass, setNewClass] = useState({ name: '', levelOrder: '', isPrePrimary: false });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', isPrePrimary: false });
  const [newYear, setNewYear] = useState({ name: '', startDate: '', endDate: '' });
  const [sectionDraft, setSectionDraft] = useState({});
  const [editingSubjectsFor, setEditingSubjectsFor] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const load = useCallback(async () => {
    try {
      const [classList, subjectList, yearList] = await Promise.all([
        admin.getClasses(),
        admin.getSubjects(),
        admin.getYears(),
      ]);
      setClasses(classList);
      setSubjects(subjectList);
      setYears(yearList);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load academics.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (error) =>
    setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Something went wrong.' });

  async function openSubjects(classId) {
    try {
      const current = await admin.getClassSubjects(classId);
      setSelectedSubjects(current.map((subject) => subject.id));
      setEditingSubjectsFor(classId);
    } catch (error) {
      fail(error);
    }
  }

  async function saveClassSubjects() {
    try {
      const saved = await admin.setClassSubjects(editingSubjectsFor, selectedSubjects);
      setNotice({ kind: 'success', text: `Saved ${saved.length} subject(s) for this class.` });
      setEditingSubjectsFor(null);
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Classes & subjects"
        subtitle="Academic structure: classes, sections, subjects and academic years."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item}
            className={`tab ${tab === item ? 'is-active' : ''}`} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Classes' && (
        <>
          <section className="section-card">
            <h3>Add a class</h3>
            <div className="inline-form">
              <Field label="Name" value={newClass.name} placeholder="Class 13"
                onChange={(event) => setNewClass((c) => ({ ...c, name: event.target.value }))} />
              <Field label="Level order" type="number" min="0" value={newClass.levelOrder}
                onChange={(event) => setNewClass((c) => ({ ...c, levelOrder: event.target.value }))} />
              <label className="check">
                <input type="checkbox" checked={newClass.isPrePrimary}
                  onChange={(event) => setNewClass((c) => ({ ...c, isPrePrimary: event.target.checked }))} />
                <span>Pre-primary</span>
              </label>
              <button type="button" className="btn-primary" disabled={!newClass.name || newClass.levelOrder === ''}
                onClick={async () => {
                  try {
                    await admin.createClass({
                      name: newClass.name,
                      levelOrder: Number(newClass.levelOrder),
                      isPrePrimary: newClass.isPrePrimary,
                    });
                    setNewClass({ name: '', levelOrder: '', isPrePrimary: false });
                    setNotice({ kind: 'success', text: 'Class created.' });
                    load();
                  } catch (error) {
                    fail(error);
                  }
                }}>
                Add class
              </button>
            </div>
          </section>

          {classes.map((klass) => (
            <section className="section-card" key={klass.id}>
              <header className="section-card__head">
                <div>
                  <h3>{klass.name}</h3>
                  <p>
                    {klass.sections.length} section(s) · {klass.student_count} students ·{' '}
                    {klass.subject_count} subjects
                  </p>
                </div>
                <button type="button" className="btn-ghost" onClick={() => openSubjects(klass.id)}>
                  Edit subjects
                </button>
              </header>

              {klass.sections.length === 0 ? (
                <p className="table-empty">No sections yet.</p>
              ) : (
                <ul className="file-list">
                  {klass.sections.map((section) => (
                    <li key={section.id}>
                      <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
                      <strong>Section {section.name}</strong>
                      <span className="muted">
                        {section.students}/{section.capacity} students
                      </span>
                      <span className="muted">{section.class_teacher || 'no class teacher'}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="inline-form">
                <Field label="New section" placeholder="D" value={sectionDraft[klass.id] || ''}
                  onChange={(event) => setSectionDraft((c) => ({ ...c, [klass.id]: event.target.value }))} />
                <button type="button" className="btn-ghost" disabled={!sectionDraft[klass.id]}
                  onClick={async () => {
                    try {
                      await admin.createSection(klass.id, { name: sectionDraft[klass.id] });
                      setSectionDraft((c) => ({ ...c, [klass.id]: '' }));
                      setNotice({ kind: 'success', text: 'Section added.' });
                      load();
                    } catch (error) {
                      fail(error);
                    }
                  }}>
                  Add section
                </button>
              </div>

              {editingSubjectsFor === klass.id && (
                <div className="subject-picker">
                  <strong>Subjects for {klass.name}</strong>
                  <div className="subject-picker__grid">
                    {subjects.map((subject) => (
                      <label key={subject.id} className="check">
                        <input type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={(event) => {
                            setSelectedSubjects((current) =>
                              event.target.checked
                                ? [...current, subject.id]
                                : current.filter((id) => id !== subject.id),
                            );
                          }} />
                        <span>{subject.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="inline-form">
                    <button type="button" className="btn-primary" onClick={saveClassSubjects}>Save</button>
                    <button type="button" className="btn-ghost" onClick={() => setEditingSubjectsFor(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {tab === 'Subjects' && (
        <>
          <section className="section-card">
            <h3>Add a subject</h3>
            <div className="inline-form">
              <Field label="Name" value={newSubject.name} placeholder="Science"
                onChange={(event) => setNewSubject((c) => ({ ...c, name: event.target.value }))} />
              <Field label="Code" value={newSubject.code} placeholder="SCI"
                onChange={(event) => setNewSubject((c) => ({ ...c, code: event.target.value.toUpperCase() }))} />
              <label className="check">
                <input type="checkbox" checked={newSubject.isPrePrimary}
                  onChange={(event) => setNewSubject((c) => ({ ...c, isPrePrimary: event.target.checked }))} />
                <span>Pre-primary</span>
              </label>
              <button type="button" className="btn-primary" disabled={!newSubject.name || !newSubject.code}
                onClick={async () => {
                  try {
                    await admin.createSubject(newSubject);
                    setNewSubject({ name: '', code: '', isPrePrimary: false });
                    setNotice({ kind: 'success', text: 'Subject created.' });
                    load();
                  } catch (error) {
                    fail(error);
                  }
                }}>
                Add subject
              </button>
            </div>
          </section>

          <section className="section-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Subject</th><th>Code</th><th>Classes</th><th>Teachers</th><th /></tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td>{subject.name}</td>
                      <td className="mono">{subject.code}</td>
                      <td>{subject.class_count}</td>
                      <td>{subject.teacher_count}</td>
                      <td className="align-right">
                        <button type="button" className="link-button"
                          onClick={async () => {
                            if (!window.confirm(`Remove ${subject.name}?`)) return;
                            try {
                              await admin.deleteSubject(subject.id);
                              setNotice({ kind: 'success', text: 'Subject removed.' });
                              load();
                            } catch (error) {
                              fail(error);
                            }
                          }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'Academic years' && (
        <>
          <section className="section-card">
            <h3>Add an academic year</h3>
            <div className="inline-form">
              <Field label="Name" placeholder="2027-2028" value={newYear.name}
                onChange={(event) => setNewYear((c) => ({ ...c, name: event.target.value }))} />
              <Field label="Start" type="date" value={newYear.startDate}
                onChange={(event) => setNewYear((c) => ({ ...c, startDate: event.target.value }))} />
              <Field label="End" type="date" value={newYear.endDate}
                onChange={(event) => setNewYear((c) => ({ ...c, endDate: event.target.value }))} />
              <button type="button" className="btn-primary"
                disabled={!newYear.name || !newYear.startDate || !newYear.endDate}
                onClick={async () => {
                  try {
                    await admin.createYear(newYear);
                    setNewYear({ name: '', startDate: '', endDate: '' });
                    setNotice({ kind: 'success', text: 'Academic year created.' });
                    load();
                  } catch (error) {
                    fail(error);
                  }
                }}>
                Add year
              </button>
            </div>
          </section>

          <section className="section-card">
            <ul className="file-list">
              {years.map((year) => (
                <li key={year.id}>
                  <i className="bi bi-calendar3" aria-hidden="true" />
                  <strong>{year.name}</strong>
                  <span className="muted">{year.start_label} → {year.end_label}</span>
                  {year.is_current ? (
                    <span className="status-badge status-badge--mint">current</span>
                  ) : (
                    <button type="button" className="link-button"
                      onClick={async () => {
                        try {
                          await admin.setCurrentYear(year.id);
                          setNotice({ kind: 'success', text: `${year.name} is now the current year.` });
                          load();
                        } catch (error) {
                          fail(error);
                        }
                      }}>
                      Make current
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
