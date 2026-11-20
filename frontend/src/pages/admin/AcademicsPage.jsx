import { useCallback, useEffect, useMemo, useState } from 'react';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

const TABS = ['Classes', 'Sections', 'Subjects', 'Academic years'];

export default function AcademicsPage() {
  const [tab, setTab] = useState('Classes');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [newClass, setNewClass] = useState({ name: '', levelOrder: '', isPrePrimary: false });
  const [newSubject, setNewSubject] = useState({ name: '', code: '', isPrePrimary: false });
  const [newYear, setNewYear] = useState({ name: '', startDate: '', endDate: '' });
  const [newSection, setNewSection] = useState({ classId: '', name: '' });
  const [editingSubjectsFor, setEditingSubjectsFor] = useState(null);
  const [editingStreamId, setEditingStreamId] = useState(null);
  const [streams, setStreams] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const load = useCallback(async () => {
    try {
      const [classList, subjectList, yearList, options] = await Promise.all([
        admin.getClasses(),
        admin.getSubjects(),
        admin.getYears(),
        admin.getOptions().catch(() => null),
      ]);
      setClasses(classList);
      setSubjects(subjectList);
      setYears(yearList);
      setStreams(options?.streams || []);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load academics.' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fail = (error) =>
    setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Something went wrong.' });

  const sectionRows = useMemo(
    () =>
      classes.flatMap((klass) =>
        klass.sections.map((section) => ({
          ...section,
          className: klass.name,
          classId: klass.id,
        })),
      ),
    [classes],
  );

  async function openSubjects(classId, streamId = null) {
    try {
      const current = await admin.getClassSubjects(classId, streamId);
      setSelectedSubjects(current.map((subject) => subject.id));
      setEditingSubjectsFor(classId);
      setEditingStreamId(streamId);
      // The picker lives in the right-hand column; on a narrow screen bring it into view.
      requestAnimationFrame(() => {
        document.querySelector('.academics-side')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } catch (error) {
      fail(error);
    }
  }

  async function saveClassSubjects() {
    try {
      const saved = await admin.setClassSubjects(editingSubjectsFor, selectedSubjects, editingStreamId);
      const label = editingClass?.needs_stream
        ? `${editingClass.name} · ${streams.find((s) => s.id === editingStreamId)?.name || 'stream'}`
        : editingClass?.name || 'This class';
      setNotice({ kind: 'success', text: `Saved ${saved.length} subject(s) for ${label}.` });
      // Refresh the table so the per-stream counts change on screen.
      await load();
      // Senior classes keep the panel open: the next stream is one click away.
      if (!editingClass?.needs_stream) {
        setEditingSubjectsFor(null);
        setEditingStreamId(null);
      }
    } catch (error) {
      fail(error);
    }
  }

  const editingClass = classes.find((klass) => klass.id === editingSubjectsFor);
  const sectionClass = classes.find((klass) => String(klass.id) === String(newSection.classId));

  return (
    <div className="page academics-page">
      <PageHeader
        title="Classes & subjects"
        subtitle="Academic structure: classes, sections, subjects and academic years."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={tab === item}
            className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Classes' && (
        <>
          <div className="academics-layout">
            <section className="section-card">
              <div className="section-card__head">
                <h3>Classes</h3>
                <span className="muted">{classes.length} defined</span>
              </div>

              {classes.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state__icon"><i className="bi bi-building" aria-hidden="true" /></span>
                  <strong>No classes yet</strong>
                  <span>Add the first class in the panel beside this table.</span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th className="align-right">Level</th>
                        <th className="align-right">Sections</th>
                        <th className="align-right">Students</th>
                        <th className="align-right">Subjects</th>
                        <th className="col-actions align-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((klass) => (
                        <tr key={klass.id}>
                          <td data-label="Class">
                            <strong>{klass.name}</strong>
                          </td>
                          <td className="align-right num" data-label="Level">{klass.level_order}</td>
                          <td className="align-right num" data-label="Sections">{klass.sections.length}</td>
                          <td className="align-right num" data-label="Students">{klass.student_count}</td>
                          <td className="align-right num" data-label="Subjects">
                            {klass.needs_stream ? (
                              <span className="stream-counts">
                                {(klass.subjects_by_stream || []).length === 0
                                  ? <span className="muted">none yet</span>
                                  : klass.subjects_by_stream.map((row) => (
                                      <span key={row.stream_id ?? 'none'} className="stream-count">
                                        {row.stream || 'General'}
                                        <strong>{row.subjects}</strong>
                                      </span>
                                    ))}
                              </span>
                            ) : (
                              klass.subject_count
                            )}
                          </td>
                          <td className="align-right" data-label="Actions">
                            <span className="row-actions">
                              <button type="button" className="link-button"
                                onClick={() => {
                                  setNewSection({ classId: String(klass.id), name: '' });
                                  setTab('Sections');
                                }}>
                                Open sections
                              </button>
                              <button type="button" className="btn-ghost btn--sm"
                                onClick={() => openSubjects(klass.id, null)}>
                                Edit subjects
                              </button>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="section-card academics-side">
              {editingSubjectsFor !== null ? (
                <>
                  <div className="section-card__head">
                    <h3>{editingClass?.name || 'Class'} subjects</h3>
                    <span className="muted">{selectedSubjects.length} selected</span>
                  </div>
                  {editingClass?.needs_stream && (
                    <div className="stream-tabs" role="tablist" aria-label="Class stream">
                      {streams.map((stream) => (
                        <button key={stream.id} type="button" role="tab"
                          aria-selected={editingStreamId === stream.id}
                          className={`tab ${editingStreamId === stream.id ? 'is-active' : ''}`}
                          onClick={() => openSubjects(editingClass.id, stream.id)}>
                          {stream.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {editingClass?.needs_stream && !editingStreamId ? (
                    <p className="muted stream-hint">
                      Pick a stream above — Class 11 and Class 12 keep their own subject list per
                      stream. Classes below 11 do not use streams at all.
                    </p>
                  ) : subjects.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-state__icon"><i className="bi bi-journal" aria-hidden="true" /></span>
                      <strong>No subjects defined</strong>
                      <span>Create subjects first, then map them to this class.</span>
                    </div>
                  ) : (
                    <div className="subject-grid">
                      {subjects.map((subject) => (
                        <label key={subject.id} className="check">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(subject.id)}
                            onChange={(event) => {
                              setSelectedSubjects((current) =>
                                event.target.checked
                                  ? [...current, subject.id]
                                  : current.filter((id) => id !== subject.id),
                              );
                            }}
                          />
                          <span>
                            {subject.name} <span className="muted mono">{subject.code}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="form-actions">
                    <button type="button" className="btn-ghost"
                      onClick={() => { setEditingSubjectsFor(null); setEditingStreamId(null); }}>
                      Cancel
                    </button>
                    <button type="button" className="btn-primary"
                      disabled={Boolean(editingClass?.needs_stream && !editingStreamId)}
                      onClick={saveClassSubjects}>
                      Save subjects
                    </button>
                  </div>
                </>
              ) : (
              <>
              <div className="section-card__head">
                <h3>Add a class</h3>
                <span className="muted">Name and level</span>
              </div>
              <div className="stack">
                <Field label="Name" name="className" value={newClass.name} placeholder="Class 13"
                  onChange={(event) => setNewClass((c) => ({ ...c, name: event.target.value }))} />
                <Field label="Level order" name="levelOrder" type="number" min="0" value={newClass.levelOrder}
                  hint="Sorts the class in lists and registers."
                  onChange={(event) => setNewClass((c) => ({ ...c, levelOrder: event.target.value }))} />
                <label className="check">
                  <input type="checkbox" checked={newClass.isPrePrimary}
                    onChange={(event) => setNewClass((c) => ({ ...c, isPrePrimary: event.target.checked }))} />
                  <span>Pre-primary</span>
                </label>
                <button type="button" className="btn-primary btn--block"
                  disabled={!newClass.name || newClass.levelOrder === ''}
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
              </>
              )}
            </section>
          </div>

        </>
      )}

      {tab === 'Sections' && (
        <div className="academics-layout">
          <section className="section-card">
            <div className="section-card__head">
              <h3>Sections</h3>
              <span className="muted">{sectionRows.length} across {classes.length} classes</span>
            </div>

            {sectionRows.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><i className="bi bi-grid-3x3-gap" aria-hidden="true" /></span>
                <strong>No sections yet</strong>
                <span>A class needs at least one section before students can be placed.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Stream</th>
                      <th>Section</th>
                      <th className="align-right">Students</th>
                      <th>Class teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((section) => (
                      <tr key={section.id}>
                        <td data-label="Class">{section.className}</td>
                        <td data-label="Stream">
                          {section.stream || <span className="muted">—</span>}
                        </td>
                        <td data-label="Section"><strong>Section {section.name}</strong></td>
                        <td className="align-right num" data-label="Students">
                          {section.students}/{section.capacity}
                        </td>
                        <td data-label="Class teacher">
                          {section.class_teacher || <span className="muted">No class teacher</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card academics-side">
            <div className="section-card__head">
              <h3>Add a section</h3>
              <span className="muted">New</span>
            </div>
            <div className="stack">
              <Select label="Class" name="sectionClass" value={newSection.classId} placeholder="Select class"
                onChange={(event) => setNewSection((c) => ({ ...c, classId: event.target.value, streamId: '' }))}
                options={classes.map((klass) => ({ value: klass.id, label: klass.name }))} />
              {sectionClass?.needs_stream && (
                <Select label="Stream" name="sectionStream" value={newSection.streamId || ''}
                  placeholder="Select stream"
                  hint="Class 11 and Class 12 run one section per stream."
                  onChange={(event) => setNewSection((c) => ({ ...c, streamId: event.target.value }))}
                  options={streams.map((stream) => ({ value: stream.id, label: stream.name }))} />
              )}
              <Field label="Section name" name="sectionName" value={newSection.name} placeholder="D"
                hint="A letter or short code, e.g. A, B, D."
                onChange={(event) => setNewSection((c) => ({ ...c, name: event.target.value }))} />
              <button type="button" className="btn-primary btn--block"
                disabled={!newSection.classId || !newSection.name
                  || Boolean(sectionClass?.needs_stream && !newSection.streamId)}
                onClick={async () => {
                  try {
                    await admin.createSection(newSection.classId, {
                      name: newSection.name,
                      ...(newSection.streamId ? { streamId: Number(newSection.streamId) } : {}),
                    });
                    setNewSection({ classId: newSection.classId, name: '', streamId: '' });
                    setNotice({ kind: 'success', text: 'Section added.' });
                    load();
                  } catch (error) {
                    fail(error);
                  }
                }}>
                Add section
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === 'Subjects' && (
        <div className="academics-layout">
          <section className="section-card">
            <div className="section-card__head">
              <h3>Subjects</h3>
              <span className="muted">{subjects.length} defined</span>
            </div>

            {subjects.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><i className="bi bi-journal" aria-hidden="true" /></span>
                <strong>No subjects yet</strong>
                <span>Add a subject, then map it to classes from the Classes tab.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th className="align-right">Classes</th>
                      <th className="align-right">Teachers</th>
                      <th className="col-actions align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td data-label="Subject"><strong>{subject.name}</strong></td>
                        <td className="mono" data-label="Code">{subject.code}</td>
                        <td className="align-right num" data-label="Classes">{subject.class_count}</td>
                        <td className="align-right num" data-label="Teachers">{subject.teacher_count}</td>
                        <td className="align-right" data-label="Actions">
                          <span className="row-actions">
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
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card academics-side">
            <div className="section-card__head">
              <h3>Add a subject</h3>
              <span className="muted">New</span>
            </div>
            <div className="stack">
              <Field label="Name" name="subjectName" value={newSubject.name} placeholder="Science"
                onChange={(event) => setNewSubject((c) => ({ ...c, name: event.target.value }))} />
              <Field label="Code" name="subjectCode" value={newSubject.code} placeholder="SCI" maxLength={12}
                hint="Short code used on reports and timetables."
                onChange={(event) => setNewSubject((c) => ({ ...c, code: event.target.value.toUpperCase() }))} />
              <label className="check">
                <input type="checkbox" checked={newSubject.isPrePrimary}
                  onChange={(event) => setNewSubject((c) => ({ ...c, isPrePrimary: event.target.checked }))} />
                <span>Pre-primary</span>
              </label>
              <button type="button" className="btn-primary btn--block"
                disabled={!newSubject.name || !newSubject.code}
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
        </div>
      )}

      {tab === 'Academic years' && (
        <div className="academics-layout">
          <section className="section-card">
            <div className="section-card__head">
              <h3>Academic years</h3>
              <span className="muted">{years.length} defined</span>
            </div>

            {years.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon"><i className="bi bi-calendar3" aria-hidden="true" /></span>
                <strong>No academic year yet</strong>
                <span>Admissions and placements need a current academic year.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Status</th>
                      <th className="col-actions align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((year) => (
                      <tr key={year.id}>
                        <td data-label="Year"><strong>{year.name}</strong></td>
                        <td data-label="Start">{year.start_label}</td>
                        <td data-label="End">{year.end_label}</td>
                        <td data-label="Status">
                          {year.is_current ? (
                            <span className="status-badge status-badge--mint">current</span>
                          ) : (
                            <span className="muted">Closed</span>
                          )}
                        </td>
                        <td className="align-right" data-label="Actions">
                          {!year.is_current && (
                            <span className="row-actions">
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
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="section-card academics-side">
            <div className="section-card__head">
              <h3>Add an academic year</h3>
              <span className="muted">New</span>
            </div>
            <div className="stack">
              <Field label="Name" name="yearName" placeholder="2027-2028" value={newYear.name}
                onChange={(event) => setNewYear((c) => ({ ...c, name: event.target.value }))} />
              <Field label="Start" name="yearStart" type="date" value={newYear.startDate}
                onChange={(event) => setNewYear((c) => ({ ...c, startDate: event.target.value }))} />
              <Field label="End" name="yearEnd" type="date" value={newYear.endDate}
                onChange={(event) => setNewYear((c) => ({ ...c, endDate: event.target.value }))} />
              <button type="button" className="btn-primary btn--block"
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
        </div>
      )}
    </div>
  );
}
