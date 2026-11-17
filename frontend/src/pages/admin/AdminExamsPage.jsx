import { useEffect, useState } from 'react';
import * as examsApi from '../../services/exams.js';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

const EXAM_TYPES = [
  { value: 'unit_test', label: 'Unit test' },
  { value: 'mid_term', label: 'Mid term' },
  { value: 'final', label: 'Final' },
  { value: 'practical', label: 'Practical' },
  { value: 'internal_assessment', label: 'Internal assessment' },
];

const TYPE_LABEL = Object.fromEntries(EXAM_TYPES.map((type) => [type.value, type.label]));

const today = () => new Date().toISOString().slice(0, 10);

const typeLabel = (value) => TYPE_LABEL[value] || String(value || '').replace(/_/g, ' ');

function examProgress(detail) {
  const papers = detail?.schedules || [];
  const total = papers.reduce((sum, paper) => sum + Number(paper.student_count || 0), 0);
  const entered = papers.reduce(
    (sum, paper) => sum + Math.min(Number(paper.marks_entered || 0), Number(paper.student_count || 0)),
    0,
  );
  const complete = papers.filter(
    (paper) => Number(paper.marks_entered) >= Number(paper.student_count),
  ).length;
  return {
    papers: papers.length,
    total,
    entered,
    complete,
    pct: total > 0 ? Math.round((entered / total) * 100) : 0,
  };
}

function publishGate(exam, detail) {
  if (exam.publish_status === 'published') {
    return { blocked: false, text: 'Published — unpublishing hides results from students and parents.' };
  }
  if (!detail) return { blocked: false, text: 'Open the exam to check paper completeness.' };
  if (detail.schedules.length === 0) {
    return { blocked: true, text: 'Add at least one paper before publishing.' };
  }
  const pending = detail.schedules.filter(
    (paper) => Number(paper.marks_entered) < Number(paper.student_count),
  );
  if (pending.length > 0) {
    return {
      blocked: true,
      text: `${pending.length} of ${detail.schedules.length} papers still need marks.`,
    };
  }
  return {
    blocked: false,
    text: `All ${detail.schedules.length} papers have marks — ready to publish.`,
  };
}

function paperState(paper) {
  if (Number(paper.marks_submitted) > 0) return { tone: 'mint', label: 'submitted' };
  if (Number(paper.marks_entered) > 0) return { tone: 'amber', label: 'draft' };
  return { tone: 'blue', label: 'not entered' };
}

export default function AdminExamsPage() {
  const [examList, setExamList] = useState([]);
  const [options, setOptions] = useState(null);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [form, setForm] = useState({ name: '', examType: 'unit_test', startDate: today(), endDate: today() });
  const [schedule, setSchedule] = useState({
    classId: '',
    subjectId: '',
    examDate: today(),
    startTime: '09:00',
    endTime: '10:30',
    maxMarks: 100,
    room: '',
  });

  const [marksOpen, setMarksOpen] = useState(null);
  const [marksSheet, setMarksSheet] = useState(null);
  const [marksDraft, setMarksDraft] = useState({});
  const [marksBusy, setMarksBusy] = useState(false);
  const [unlockFor, setUnlockFor] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [overrideFor, setOverrideFor] = useState(null);
  const [overrideDraft, setOverrideDraft] = useState({ marks: '', absent: false, reason: '' });

  async function load() {
    try {
      const [list, opts] = await Promise.all([examsApi.listExams(), admin.getOptions()]);
      setExamList(list);
      setOptions(opts);

      const pairs = await Promise.all(
        list.map(async (exam) => {
          try {
            return [exam.id, await examsApi.getExam(exam.id)];
          } catch {
            return [exam.id, null];
          }
        }),
      );
      setDetails(Object.fromEntries(pairs.filter(([, value]) => value)));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load exams.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openExam(id) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    try {
      setOpenId(id);
      setDetail(null);
      setMarksOpen(null);
      setMarksSheet(null);
      const fresh = await examsApi.getExam(id);
      setDetail(fresh);
      setDetails((current) => ({ ...current, [id]: fresh }));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not open the exam.' });
    }
  }

  async function refreshDetail() {
    if (!openId) return;
    try {
      const fresh = await examsApi.getExam(openId);
      setDetail(fresh);
      setDetails((current) => ({ ...current, [openId]: fresh }));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not refresh the exam.' });
    }
    await load();
  }

  function hydrateMarksSheet(data) {
    setMarksSheet(data);
    setMarksDraft(
      Object.fromEntries(
        data.students.map((student) => [
          student.student_id,
          { marks: student.marks_obtained ?? '', absent: Boolean(student.is_absent) },
        ]),
      ),
    );
  }

  async function toggleMarks(paper) {
    if (marksOpen === paper.id) {
      setMarksOpen(null);
      setMarksSheet(null);
      return;
    }
    try {
      const data = await examsApi.marksSheet(paper.id);
      setMarksOpen(paper.id);
      hydrateMarksSheet(data);
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not open the marks sheet.' });
    }
  }

  async function reloadMarks(scheduleId) {
    if (!scheduleId) return;
    try {
      hydrateMarksSheet(await examsApi.marksSheet(scheduleId));
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not refresh the marks sheet.' });
    }
  }

  async function saveMarksSheet(submit) {
    if (!marksSheet) return;
    setMarksBusy(true);
    try {
      const entries = marksSheet.students.map((student) => {
        const row = marksDraft[student.student_id] || {};
        return {
          studentId: student.student_id,
          isAbsent: Boolean(row.absent),
          marksObtained: row.absent || row.marks === '' || row.marks === undefined ? null : Number(row.marks),
        };
      });
      const result = await examsApi.saveMarks(marksOpen, { entries, submit });
      setNotice({
        kind: 'success',
        text: submit
          ? `Submitted ${result.saved} mark(s). The paper is locked until an admin unlocks it.`
          : `Saved ${result.saved} draft mark(s).`,
      });
      await reloadMarks(marksOpen);
      await refreshDetail();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save marks.' });
    } finally {
      setMarksBusy(false);
    }
  }

  async function submitUnlock() {
    if (!unlockFor) return;
    try {
      const result = await examsApi.unlockMarks(unlockFor.scheduleId, unlockReason.trim());
      setNotice({
        kind: 'success',
        text: `Unlocked ${result.unlocked} submitted mark(s). The reason is in the audit log.`,
      });
      setUnlockFor(null);
      setUnlockReason('');
      await reloadMarks(unlockFor.scheduleId);
      await refreshDetail();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not unlock the paper.' });
    }
  }

  function openOverride(scheduleId, student) {
    setOverrideFor({ scheduleId, student });
    setOverrideDraft({
      marks: student.marks_obtained ?? '',
      absent: Boolean(student.is_absent),
      reason: '',
    });
  }

  async function submitOverride() {
    if (!overrideFor) return;
    try {
      await examsApi.overrideMark(overrideFor.scheduleId, {
        studentId: overrideFor.student.student_id,
        marksObtained: overrideDraft.absent || overrideDraft.marks === '' ? null : Number(overrideDraft.marks),
        isAbsent: Boolean(overrideDraft.absent),
        reason: overrideDraft.reason.trim(),
      });
      setNotice({
        kind: 'success',
        text: `Mark overridden for ${overrideFor.student.name}. The previous value and reason are in the audit log.`,
      });
      setOverrideFor(null);
      await reloadMarks(overrideFor.scheduleId);
      await refreshDetail();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not override the mark.' });
    }
  }

  const marksStudents = marksSheet?.students || [];
  const submittedCount = marksStudents.filter((student) => student.status === 'submitted').length;
  const enteredCount = marksStudents.filter((student) => student.status === 'draft').length;
  const notEnteredCount = marksStudents.length - submittedCount - enteredCount;
  const marksLocked = marksSheet ? !marksSheet.editable : false;
  const canUnlock = Boolean(marksSheet) && submittedCount > 0 && marksSheet.publish_status !== 'published';
  const overrideRange = overrideFor ? Number(marksSheet?.max_marks || 0) : 0;
  const overrideValid =
    overrideDraft.reason.trim().length >= 5 &&
    (overrideDraft.absent ||
      (overrideDraft.marks !== '' &&
        Number(overrideDraft.marks) >= 0 &&
        Number(overrideDraft.marks) <= overrideRange));

  return (
    <div className="page exams-page">
      <PageHeader
        title="Examinations"
        subtitle="Create exams, schedule papers, and publish results when every mark is in."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card exam-create">
        <div className="section-card__head">
          <h3>New examination</h3>
          <span className="muted">Name, type and date range — papers come next</span>
        </div>
        <div className="form-grid exam-create__grid">
          <Field label="Name" name="exam-name" required value={form.name} placeholder="Term II Examination"
            onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
          <Select label="Type" name="exam-type" value={form.examType}
            onChange={(event) => setForm((c) => ({ ...c, examType: event.target.value }))}
            options={EXAM_TYPES} />
          <Field label="Start date" name="exam-start" type="date" value={form.startDate}
            onChange={(event) => setForm((c) => ({ ...c, startDate: event.target.value }))} />
          <Field label="End date" name="exam-end" type="date" value={form.endDate}
            onChange={(event) => setForm((c) => ({ ...c, endDate: event.target.value }))} />
        </div>
        <div className="form-actions exam-create__actions">
          <span className="field-hint exam-create__hint">
            {form.name.trim().length < 2 ? 'Minimum 2 characters.' : 'The exam is created as a draft.'}
          </span>
          <button type="button" className="btn-primary" disabled={!form.name || form.name.length < 2}
            onClick={async () => {
              try {
                await examsApi.createExam(form);
                setForm({ name: '', examType: 'unit_test', startDate: today(), endDate: today() });
                setNotice({ kind: 'success', text: 'Exam created.' });
                load();
              } catch (error) {
                setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not create the exam.' });
              }
            }}>
            <i className="bi bi-plus-lg" aria-hidden="true" />
            Create exam
          </button>
        </div>
      </section>

      {loading && (
        <div className="loading-block">
          <div className="skeleton skeleton--banner" />
          <div className="skeleton skeleton--table" />
        </div>
      )}

      {!loading && examList.length === 0 && (
        <section className="section-card">
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-journal-text" aria-hidden="true" /></span>
            <strong>No examinations yet</strong>
            <span>Create the first exam above, then add one paper per class and subject.</span>
          </div>
        </section>
      )}

      {!loading && examList.map((exam) => {
        const examDetail = openId === exam.id ? detail : details[exam.id] || null;
        const progress = examProgress(examDetail);
        const gate = publishGate(exam, examDetail);
        const published = exam.publish_status === 'published';
        const progressFill = progress.pct >= 100 ? 'is-complete' : progress.pct > 0 ? 'is-partial' : 'is-empty';

        return (
          <section className="section-card exam-card" key={exam.id}>
            <div className="exam-card__top">
              <div className="exam-card__identity">
                <div className="exam-card__title">
                  <h3>{exam.name}</h3>
                  <span className={`status-badge status-badge--${published ? 'mint' : 'amber'}`}>
                    {published ? 'published' : 'draft'}
                  </span>
                </div>
                <div className="exam-card__meta">
                  <span><i className="bi bi-journal-bookmark" aria-hidden="true" />{typeLabel(exam.exam_type)}</span>
                  <span><i className="bi bi-calendar3" aria-hidden="true" />{exam.start_label} → {exam.end_label}</span>
                  <span><i className="bi bi-collection" aria-hidden="true" />{exam.schedule_count} paper{exam.schedule_count === 1 ? '' : 's'}</span>
                  <span><i className="bi bi-people" aria-hidden="true" />{exam.class_count} class{exam.class_count === 1 ? '' : 'es'}</span>
                </div>
              </div>
              <div className="exam-card__actions">
                <button type="button" className="btn-ghost" onClick={() => openExam(exam.id)}>
                  <i className={`bi ${openId === exam.id ? 'bi-chevron-up' : 'bi-sliders'}`} aria-hidden="true" />
                  {openId === exam.id ? 'Close' : 'Manage'}
                </button>
                <button
                  type="button"
                  className={published ? 'btn-danger' : 'btn-primary'}
                  disabled={!published && gate.blocked}
                  title={!published && gate.blocked ? gate.text : undefined}
                  onClick={async () => {
                    try {
                      await examsApi.publish(exam.id, exam.publish_status !== 'published');
                      setNotice({
                        kind: 'success',
                        text: exam.publish_status === 'published' ? 'Exam unpublished.' : 'Results published.',
                      });
                      await load();
                      await refreshDetail();
                    } catch (error) {
                      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not publish.' });
                    }
                  }}>
                  <i className={`bi ${published ? 'bi-eye-slash' : 'bi-send'}`} aria-hidden="true" />
                  {published ? 'Unpublish' : 'Publish results'}
                </button>
              </div>
            </div>

            <div className="exam-card__progress">
              <div className="exam-progress">
                <div className="exam-progress__head">
                  <span>Marks entered</span>
                  <span className="exam-progress__value">{progress.entered} / {progress.total}</span>
                </div>
                <div className="exam-progress__track"
                  role="progressbar"
                  aria-label={`Marks entered for ${exam.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.pct}>
                  <span className={`exam-progress__fill ${progressFill}`} style={{ width: `${progress.pct}%` }} />
                </div>
                <div className="exam-progress__foot">
                  <span>{progress.complete} of {progress.papers} papers complete</span>
                  <span>{progress.pct}%</span>
                </div>
              </div>
              <p className={`exam-card__gate ${published ? 'is-published' : gate.blocked ? 'is-blocked' : 'is-ready'}`}>
                <i
                  className={`bi ${published ? 'bi-eye' : gate.blocked ? 'bi-lock' : 'bi-check2-circle'}`}
                  aria-hidden="true"
                />
                {gate.text}
              </p>
            </div>

            {openId === exam.id && !detail && (
              <div className="loading-block exam-detail__loading">
                <div className="skeleton skeleton--card" />
              </div>
            )}

            {openId === exam.id && detail && (
              <div className="exam-detail">
                <div className="exam-detail__head">
                  <h4>Schedules</h4>
                  <span className="exam-detail__count">
                    {detail.schedules.length} paper{detail.schedules.length === 1 ? '' : 's'}
                  </span>
                </div>

                {detail.schedules.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-state__icon"><i className="bi bi-calendar-plus" aria-hidden="true" /></span>
                    <strong>No papers scheduled</strong>
                    <span>Add the first paper below — each paper is one class and one subject.</span>
                  </div>
                ) : (
                  <div className="table-wrap exam-schedules">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class</th>
                          <th>Subject</th>
                          <th>Time</th>
                          <th className="align-right">Max</th>
                          <th>Room</th>
                          <th>Marks</th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {detail.schedules.map((paper) => {
                          const count = Number(paper.student_count || 0);
                          const done = Math.min(Number(paper.marks_entered || 0), count);
                          const pct = count > 0 ? Math.round((done / count) * 100) : 0;
                          const state = paperState(paper);
                          return (
                            <tr key={paper.id} className={marksOpen === paper.id ? 'is-selected' : ''}>
                              <td data-label="Date" className="mono">{paper.date_label}</td>
                              <td data-label="Class">{paper.class_name}</td>
                              <td data-label="Subject">
                                {paper.subject_name}
                                {paper.subject_code && <span className="exam-subject-code">{paper.subject_code}</span>}
                              </td>
                              <td data-label="Time" className="mono">{paper.start_time}–{paper.end_time}</td>
                              <td data-label="Max marks" className="align-right mono">{Number(paper.max_marks)}</td>
                              <td data-label="Room">{paper.room || <span className="muted">—</span>}</td>
                              <td data-label="Marks">
                                <div className="exam-paper-progress">
                                  <div className="exam-paper-progress__meta">
                                    <span>{done}/{count}</span>
                                    <span className={`status-badge status-badge--${state.tone}`}>{state.label}</span>
                                  </div>
                                  <div className="exam-paper-progress__track" aria-hidden="true">
                                    <span
                                      className={`exam-paper-progress__fill ${pct >= 100 ? 'is-complete' : ''}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="align-right">
                                <div className="row-actions">
                                  <button type="button" className="link-button" onClick={() => toggleMarks(paper)}>
                                    {marksOpen === paper.id ? 'Close marks' : 'Marks'}
                                  </button>
                                  <button type="button" className="link-button exam-remove"
                                    onClick={async () => {
                                      if (!window.confirm('Remove this paper?')) return;
                                      try {
                                        await examsApi.removeSchedule(exam.id, paper.id);
                                        setNotice({ kind: 'success', text: 'Paper removed.' });
                                        refreshDetail();
                                      } catch (error) {
                                        setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove.' });
                                      }
                                    }}>
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="exam-form">
                  <div className="exam-form__fields">
                    <Select label="Class" name="paper-class" value={schedule.classId} placeholder="Select class"
                      onChange={(event) => setSchedule((c) => ({ ...c, classId: event.target.value }))}
                      options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
                    <Select label="Subject" name="paper-subject" value={schedule.subjectId} placeholder="Select subject"
                      onChange={(event) => setSchedule((c) => ({ ...c, subjectId: event.target.value }))}
                      options={(options?.subjects || []).map((subject) => ({ value: subject.id, label: subject.name }))} />
                    <Field label="Exam date" name="paper-date" type="date" value={schedule.examDate}
                      onChange={(event) => setSchedule((c) => ({ ...c, examDate: event.target.value }))} />
                    <Field label="Start" name="paper-start" type="time" value={schedule.startTime}
                      onChange={(event) => setSchedule((c) => ({ ...c, startTime: event.target.value }))} />
                    <Field label="End" name="paper-end" type="time" value={schedule.endTime}
                      onChange={(event) => setSchedule((c) => ({ ...c, endTime: event.target.value }))} />
                    <Field label="Max marks" name="paper-max" type="number" min="1" value={schedule.maxMarks}
                      onChange={(event) => setSchedule((c) => ({ ...c, maxMarks: Number(event.target.value) }))} />
                    <Field label="Room" name="paper-room" value={schedule.room} placeholder="Hall A (optional)"
                      onChange={(event) => setSchedule((c) => ({ ...c, room: event.target.value }))} />
                  </div>
                  <div className="exam-form__submit">
                    <span className="field-hint">
                      {!schedule.classId || !schedule.subjectId
                        ? 'Pick a class and a subject to add the paper.'
                        : `${schedule.maxMarks} marks · ${schedule.startTime}–${schedule.endTime}`}
                    </span>
                    <button type="button" className="btn-primary"
                      disabled={!schedule.classId || !schedule.subjectId}
                      onClick={async () => {
                        try {
                          await examsApi.addSchedule(exam.id, {
                            ...schedule,
                            classId: Number(schedule.classId),
                            subjectId: Number(schedule.subjectId),
                          });
                          setNotice({ kind: 'success', text: 'Paper scheduled.' });
                          refreshDetail();
                        } catch (error) {
                          setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not add the paper.' });
                        }
                      }}>
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      Add paper
                    </button>
                  </div>
                </div>

                {marksOpen && marksSheet && (
                  <div className="exam-marks">
                    <div className="exam-marks__head">
                      <div>
                        <div className="exam-marks__title">
                          Marks · {marksSheet.subject_name} · {marksSheet.class_name}
                        </div>
                        <div className="exam-marks__sub">
                          Max {Number(marksSheet.max_marks)} · {marksSheet.date_label} · {marksStudents.length} student{marksStudents.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      <div className="exam-marks__head-actions">
                        <span className={`status-badge status-badge--${marksSheet.publish_status === 'published' ? 'mint' : submittedCount > 0 ? 'amber' : 'blue'}`}>
                          {marksSheet.publish_status === 'published' ? 'published' : submittedCount > 0 ? 'submitted' : 'draft'}
                        </span>
                        <button type="button" className="btn-ghost btn--sm" onClick={() => { setMarksOpen(null); setMarksSheet(null); }}>
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="exam-marks__body">
                      <div className="summary-chips exam-marks__chips">
                        <span className="summary-chip"><strong>{marksStudents.length}</strong> students</span>
                        <span className="summary-chip exam-chip--submitted"><strong>{submittedCount}</strong> submitted</span>
                        <span className="summary-chip exam-chip--draft"><strong>{enteredCount}</strong> draft</span>
                        <span className="summary-chip"><strong>{notEnteredCount}</strong> not entered</span>
                        <span className="summary-chip"><strong>{submittedCount}</strong> locked</span>
                      </div>

                      {marksSheet.publish_status === 'published' && (
                        <div className="notice notice--info">
                          <i className="bi bi-info-circle" aria-hidden="true" />
                          <span>
                            Results are published, so this sheet is read-only. Unpublish the exam to edit marks;
                            an override is logged with a reason.
                          </span>
                        </div>
                      )}
                      {marksSheet.publish_status !== 'published' && !marksSheet.editable && (
                        <div className="notice notice--warning">
                          <i className="bi bi-lock" aria-hidden="true" />
                          <span>
                            Marks are submitted and locked. Unlock the paper with a reason before editing.
                          </span>
                        </div>
                      )}

                      <div className="table-wrap exam-marks__table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Admission ID</th>
                              <th className="align-right">Marks</th>
                              <th className="align-right">Max</th>
                              <th>Grade</th>
                              <th>State</th>
                              <th aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {marksStudents.map((student) => {
                              const row = marksDraft[student.student_id] || {};
                              const locked = marksLocked;
                              const state =
                                student.status === 'submitted'
                                  ? { tone: 'mint', label: 'submitted' }
                                  : student.status === 'draft'
                                    ? { tone: 'amber', label: 'draft' }
                                    : { tone: 'blue', label: 'not entered' };
                              return (
                                <tr key={student.student_id}>
                                  <td data-label="Student">
                                    {student.name}
                                    {student.is_absent && <span className="exam-absent-flag">absent</span>}
                                  </td>
                                  <td data-label="Admission ID" className="mono">{student.admission_id}</td>
                                  <td data-label="Marks" className="align-right">
                                    <input
                                      type="number"
                                      min="0"
                                      max={Number(marksSheet.max_marks)}
                                      className="marks-input"
                                      aria-label={`Marks for ${student.name}`}
                                      value={row.marks ?? ''}
                                      disabled={locked || row.absent}
                                      onChange={(event) =>
                                        setMarksDraft((current) => ({
                                          ...current,
                                          [student.student_id]: { ...current[student.student_id], marks: event.target.value },
                                        }))
                                      }
                                    />
                                  </td>
                                  <td data-label="Max" className="align-right mono">{Number(marksSheet.max_marks)}</td>
                                  <td data-label="Grade">
                                    {student.grade ? <strong className="exam-grade">{student.grade}</strong> : <span className="muted">—</span>}
                                  </td>
                                  <td data-label="State">
                                    <span className={`status-badge status-badge--${state.tone}`}>{state.label}</span>
                                  </td>
                                  <td className="align-right">
                                    <button type="button" className="link-button link-button--danger"
                                      onClick={() => openOverride(marksOpen, student)}>
                                      <i className="bi bi-pencil-square" aria-hidden="true" />
                                      Override
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="exam-marks__actions">
                        {canUnlock && (
                          <button type="button" className="btn-ghost"
                            onClick={() => { setUnlockFor({ scheduleId: marksOpen, paper: marksSheet }); setUnlockReason(''); }}>
                            <i className="bi bi-unlock" aria-hidden="true" />
                            Unlock paper
                          </button>
                        )}
                        {marksSheet.editable && (
                          <div className="row-actions">
                            <button type="button" className="btn-ghost" onClick={() => saveMarksSheet(false)} disabled={marksBusy}>
                              Save draft
                            </button>
                            <button type="button" className="btn-primary" onClick={() => saveMarksSheet(true)} disabled={marksBusy}>
                              {marksBusy ? 'Saving…' : 'Submit marks'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {unlockFor && (
        <div className="exam-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
          <div className="exam-dialog">
            <div className="exam-dialog__head">
              <span className="exam-dialog__icon exam-dialog__icon--warn" aria-hidden="true">
                <i className="bi bi-unlock" />
              </span>
              <div>
                <h3 id="unlock-title">Unlock this paper</h3>
                <p>
                  {unlockFor.paper?.subject_name} · {unlockFor.paper?.class_name} — the teacher can edit the
                  marks again. The reason is written to the audit log.
                </p>
              </div>
            </div>
            <Field label="Reason" name="unlock-reason" required value={unlockReason} minLength={5}
              placeholder="Re-mark requested after revaluation"
              hint="At least 5 characters."
              onChange={(event) => setUnlockReason(event.target.value)} />
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => { setUnlockFor(null); setUnlockReason(''); }}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={unlockReason.trim().length < 5}
                onClick={submitUnlock}>
                Unlock paper
              </button>
            </div>
          </div>
        </div>
      )}

      {overrideFor && (
        <div className="exam-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="override-title">
          <div className="exam-dialog">
            <div className="exam-dialog__head">
              <span className="exam-dialog__icon" aria-hidden="true">
                <i className="bi bi-exclamation-triangle" />
              </span>
              <div>
                <h3 id="override-title">Override mark · {overrideFor.student.name}</h3>
                <p>
                  {overrideFor.student.admission_id} · currently{' '}
                  {overrideFor.student.is_absent ? 'absent' : overrideFor.student.marks_obtained ?? 'not entered'} of{' '}
                  {Number(marksSheet?.max_marks || 0)}. The override is stored as submitted and audited.
                </p>
              </div>
            </div>
            <div className="form-grid exam-dialog__grid">
              <Field label={`New marks (0–${overrideRange})`} name="override-marks" type="number" min="0" max={overrideRange}
                value={overrideDraft.marks} disabled={overrideDraft.absent}
                onChange={(event) => setOverrideDraft((c) => ({ ...c, marks: event.target.value }))} />
              <div className="form-field exam-dialog__check">
                <label htmlFor="override-absent">Mark absent</label>
                <label className="check">
                  <input id="override-absent" type="checkbox" checked={overrideDraft.absent}
                    onChange={(event) => setOverrideDraft((c) => ({ ...c, absent: event.target.checked }))} />
                  Absent — no marks
                </label>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="override-reason">Reason <span className="req">*</span></label>
              <textarea id="override-reason" rows={3} value={overrideDraft.reason} minLength={5}
                placeholder="Why is this mark being changed?"
                onChange={(event) => setOverrideDraft((c) => ({ ...c, reason: event.target.value }))} />
              <p className="field-hint">
                {overrideDraft.reason.trim().length < 5
                  ? 'A reason of at least 5 characters is required.'
                  : 'Stored with the old and new value in the audit log.'}
              </p>
            </div>
            <div className="form-actions exam-dialog__actions">
              <span className="exam-dialog__warning">
                <i className="bi bi-shield-exclamation" aria-hidden="true" />
                Overrides bypass the teacher and cannot be undone.
              </span>
              <button type="button" className="btn-ghost" onClick={() => setOverrideFor(null)}>Cancel</button>
              <button type="button" className="btn-danger" disabled={!overrideValid} onClick={submitOverride}>
                Override mark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
