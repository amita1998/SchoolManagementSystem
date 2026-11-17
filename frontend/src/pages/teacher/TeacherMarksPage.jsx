import { useEffect, useState } from 'react';
import * as examsApi from '../../services/exams.js';
import { PageHeader, Notice, StatusBadge } from '../../components/ui/PageHeader.jsx';

export default function TeacherMarksPage() {
  const [papers, setPapers] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState({});
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [saving, setSaving] = useState(false);

  async function loadPapers() {
    try {
      setPapers(await examsApi.myPapers());
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load papers.' });
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

  return (
    <div className="page">
      <PageHeader
        title="Marks entry"
        subtitle="Enter marks for your own classes and subjects. Draft first, then submit."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        {papers.length === 0 ? (
          <p className="table-empty">No papers are assigned to you yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam</th><th>Class</th><th>Subject</th><th>Date</th>
                  <th>Progress</th><th />
                </tr>
              </thead>
              <tbody>
                {papers.map((paper) => (
                  <tr key={paper.schedule_id}>
                    <td>
                      {paper.exam_name}{' '}
                      <span className={`status-badge status-badge--${paper.publish_status === 'published' ? 'mint' : 'blue'}`}>
                        {paper.publish_status}
                      </span>
                    </td>
                    <td>{paper.class_name}</td>
                    <td>{paper.subject_name}</td>
                    <td>{paper.date_label}</td>
                    <td>
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
          <header className="section-card__head">
            <div>
              <h3>
                {sheet.exam_name} · {sheet.class_name} · {sheet.subject_name}
              </h3>
              <p>
                Max marks {Number(sheet.max_marks)} · {sheet.date_label}
              </p>
            </div>
            {sheet.publish_status === 'published' && (
              <span className="status-badge status-badge--mint">published</span>
            )}
          </header>

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
                <tr><th>Admission ID</th><th>Student</th><th>Marks</th><th>Absent</th><th>Grade</th></tr>
              </thead>
              <tbody>
                {sheet.students.map((student) => (
                  <tr key={student.student_id}>
                    <td className="mono">{student.admission_id}</td>
                    <td>{student.name}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max={Number(sheet.max_marks)}
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
                    <td>
                      <input
                        type="checkbox"
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
                    <td>{student.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <div className="wizard-actions">
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
