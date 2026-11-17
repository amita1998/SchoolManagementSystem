import { useEffect, useState } from 'react';
import * as examsApi from '../../services/exams.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function TeacherMarksPage() {
  const [papers, setPapers] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState({});
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadPapers() {
    try {
      setPapers(await examsApi.myPapers());
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load papers.' });
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    loadPapers();
  }, []);

  async function openPaper(id) {
    if (openId === id) {
      setOpenId(null);
      setSheet(null);
      return;
    }
    try {
      const data = await examsApi.marksSheet(id);
      setOpenId(id);
      setSheet(data);
      setDraft(
        Object.fromEntries(
          data.students.map((student) => [
            student.student_id,
            {
              marks: student.marks_obtained ?? '',
              absent: Boolean(student.is_absent),
            },
          ]),
        ),
      );
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not open the paper.' });
    }
  }

  async function save(submit) {
    setSaving(true);
    try {
      const entries = sheet.students.map((student) => ({
        studentId: student.student_id,
        isAbsent: draft[student.student_id]?.absent || false,
        marksObtained:
          draft[student.student_id]?.absent || draft[student.student_id]?.marks === ''
            ? null
            : Number(draft[student.student_id]?.marks),
      }));
      const result = await examsApi.saveMarks(openId, { entries, submit });
      setNotice({
        kind: 'success',
        text: submit
          ? `Submitted ${result.saved} mark(s). The admin must unlock the paper to change them.`
          : `Saved ${result.saved} draft mark(s).`,
      });
      await openPaper(openId);
      await loadPapers();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save marks.' });
    } finally {
      setSaving(false);
    }
  }

  const readOnly = sheet && !sheet.editable;

  const entered = sheet
    ? sheet.students.filter((student) => {
        const entry = draft[student.student_id];
        return entry?.absent || (entry?.marks !== '' && entry?.marks !== undefined);
      }).length
    : 0;
  const totalStudents = sheet?.students.length || 0;
  const runningTotal = sheet
    ? sheet.students.reduce((sum, student) => {
        const entry = draft[student.student_id];
        if (!entry || entry.absent || entry.marks === '') return sum;
        return sum + (Number(entry.marks) || 0);
      }, 0)
    : 0;
  const maximumTotal = sheet ? totalStudents * Number(sheet.max_marks) : 0;
  const missing = Math.max(0, totalStudents - entered);

  return (
    <div className="page">
      <PageHeader
        title="Marks entry"
        subtitle="Enter marks for your own classes and subjects. Draft first, then submit."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        <div className="section-card__head">
          <div>
            <h3>Your papers</h3>
            <span className="muted">Papers scheduled for the subjects and classes you teach.</span>
          </div>
          {papers.length > 0 && (
            <span className="summary-chip">
              <strong>{papers.length}</strong> paper{papers.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {!loaded ? (
          <div className="loading-block" aria-hidden="true">
            <div className="skeleton skeleton--table" />
          </div>
        ) : papers.length === 0 ? (
          <EmptyState
            icon="bi-journal-x"
            title="No papers assigned to you yet"
            text="The exam office adds a paper here for every schedule in your subject. Nothing to enter until then."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Progress</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => (
                  <tr key={paper.schedule_id} className={openId === paper.schedule_id ? 'is-selected' : ''}>
                    <td data-label="Exam">
                      {paper.exam_name}{' '}
                      <span
                        className={`status-badge status-badge--${paper.publish_status === 'published' ? 'mint' : 'blue'}`}
                      >
                        {paper.publish_status}
                      </span>
                    </td>
                    <td data-label="Class">{paper.class_name}</td>
                    <td data-label="Subject">{paper.subject_name}</td>
                    <td data-label="Date">{paper.date_label}</td>
                    <td data-label="Progress" className="mono">
                      {paper.submitted > 0
                        ? `${paper.submitted}/${paper.students} submitted`
                        : `${paper.entered}/${paper.students} entered`}
                    </td>
                    <td className="align-right">
                      <button type="button" className="link-button" onClick={() => openPaper(paper.schedule_id)}>
                        {openId === paper.schedule_id ? 'Close' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sheet && (
        <section className="section-card">
          <div className="section-card__head">
            <div>
              <h3>
                {sheet.exam_name} · {sheet.class_name} · {sheet.subject_name}
              </h3>
              <span className="muted">{sheet.date_label}</span>
            </div>
            {sheet.publish_status === 'published' ? (
              <span className="status-badge status-badge--mint">published</span>
            ) : (
              <span className="status-badge status-badge--blue">{readOnly ? 'submitted' : 'editable'}</span>
            )}
          </div>

          <div className="section-card__body">
            <div className="stat-row">
              <div>
                <strong>{Number(sheet.max_marks)}</strong>
                <span>Max marks</span>
              </div>
              <div>
                <strong>
                  {entered}/{totalStudents}
                </strong>
                <span>Entered</span>
              </div>
              <div>
                <strong>
                  {runningTotal}/{maximumTotal}
                </strong>
                <span>Running total</span>
              </div>
            </div>

            {readOnly && (
              <Notice kind="info">
                {sheet.publish_status === 'published'
                  ? 'Results are published. Ask the admin to unlock this paper before editing.'
                  : 'These marks are submitted. Ask the admin to unlock them before editing.'}
              </Notice>
            )}

            <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admission ID</th>
                  <th>Student</th>
                  <th className="align-right">Marks</th>
                  <th>Absent</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {sheet.students.map((student) => (
                  <tr key={student.student_id}>
                    <td data-label="Admission ID" className="mono">{student.admission_id}</td>
                    <td data-label="Student">{student.name}</td>
                    <td data-label="Marks" className="align-right">
                      <input
                        type="number"
                        min="0"
                        max={Number(sheet.max_marks)}
                        aria-label={`Marks for ${student.name}`}
                        className="marks-input"
                        value={draft[student.student_id]?.marks ?? ''}
                        disabled={readOnly || draft[student.student_id]?.absent}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [student.student_id]: { ...current[student.student_id], marks: event.target.value },
                          }))
                        }
                      />
                    </td>
                    <td data-label="Absent">
                      <input
                        type="checkbox"
                        aria-label={`${student.name} was absent`}
                        checked={draft[student.student_id]?.absent || false}
                        disabled={readOnly}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [student.student_id]: {
                              ...current[student.student_id],
                              absent: event.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td data-label="Grade">{student.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {!readOnly && missing > 0 && (
              <Notice kind="warning">
                {entered === 0
                  ? 'No marks entered yet — submitting now would save every student blank.'
                  : `${missing} of ${totalStudents} student${totalStudents === 1 ? '' : 's'} still have no mark. Submitting saves them blank.`}
              </Notice>
            )}
          </div>

          {!readOnly && (
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => save(false)} disabled={saving}>
                Save draft
              </button>
              <button type="button" className="btn-primary" onClick={() => save(true)} disabled={saving}>
                {saving ? 'Saving…' : 'Submit marks'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
