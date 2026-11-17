import { useCallback, useEffect, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';

const STATUSES = [
  { value: 'present', label: 'P', title: 'Present' },
  { value: 'absent', label: 'A', title: 'Absent' },
  { value: 'late', label: 'L', title: 'Late' },
  { value: 'half_day', label: 'H', title: 'Half day' },
  { value: 'leave', label: 'Lv', title: 'Leave' },
];

export default function TeacherAttendancePage() {
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState({});
  const [state, setState] = useState('loading');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [saving, setSaving] = useState(false);
  const [correction, setCorrection] = useState(null);

  useEffect(() => {
    attendanceApi
      .mySections()
      .then((list) => {
        setSections(list);
        if (list.length) setSectionId(String(list[0].section_id));
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  const loadSheet = useCallback(async () => {
    if (!sectionId) return;
    try {
      const data = await attendanceApi.sheet({ sectionId });
      setSheet(data);
      setDraft(
        Object.fromEntries(
          data.students.map((student) => [student.studentId, student.status || 'present']),
        ),
      );
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the sheet.' });
    }
  }, [sectionId]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  async function save() {
    setSaving(true);
    setNotice({ kind: 'info', text: '' });
    try {
      const entries = Object.entries(draft).map(([studentId, status]) => ({
        studentId: Number(studentId),
        status,
      }));
      const result = await attendanceApi.mark({ sectionId: Number(sectionId), date: sheet.date, entries });
      setNotice({ kind: 'success', text: `Attendance saved for ${result.saved} student(s).` });
      loadSheet();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save attendance.' });
    } finally {
      setSaving(false);
    }
  }

  if (state === 'error') return <Notice kind="error">Could not load your sections.</Notice>;

  if (state === 'ready' && sections.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Attendance" subtitle="Marking is limited to class teachers." />
        <Notice kind="info">
          You are not a class teacher of any section, so there is no attendance to mark. Subject
          teachers can still see the attendance of their classes from the dashboard.
        </Notice>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Mark attendance"
        subtitle="Only the class teacher of a section can mark it, once per day, until 11:59 PM."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        <div className="filters">
          <label className="form-field">
            <span>Section</span>
            <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
              {sections.map((item) => (
                <option key={item.section_id} value={item.section_id}>
                  {item.class_name} {item.section_name}
                </option>
              ))}
            </select>
          </label>
          <p className="field-hint">
            Date <strong>{sheet?.date}</strong> · {sheet?.locked ? 'locked' : 'open until 11:59 PM'}
          </p>
        </div>

        {sheet?.locked && (
          <Notice kind="error">
            This day is locked. Submit a correction request instead of marking it again.
          </Notice>
        )}

        {sheet && sheet.students.length === 0 && <p className="table-empty">No students in this section.</p>}

        {sheet && sheet.students.length > 0 && (
          <div className="table-wrap">
            <table className="data-table attendance-table">
              <thead>
                <tr>
                  <th>Admission ID</th>
                  <th>Student</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sheet.students.map((student) => (
                  <tr key={student.studentId}>
                    <td className="mono">{student.admissionId}</td>
                    <td>{student.name}</td>
                    <td>
                      {sheet.locked ? (
                        <div className="inline-form">
                          <span className={`status-badge status-badge--${student.status === 'present' ? 'mint' : 'coral'}`}>
                            {student.status || 'not marked'}
                          </span>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() =>
                              setCorrection({
                                attendanceId: student.attendanceId,
                                studentName: student.name,
                                requestedStatus: student.status === 'present' ? 'absent' : 'present',
                                reason: '',
                              })
                            }
                          >
                            Request correction
                          </button>
                        </div>
                      ) : (
                        <div className="status-buttons">
                          {STATUSES.map((status) => (
                            <button
                              key={status.value}
                              type="button"
                              title={status.title}
                              className={draft[student.studentId] === status.value ? 'is-active' : ''}
                              data-status={status.value}
                              disabled={!sheet.canMark}
                              onClick={() =>
                                setDraft((current) => ({ ...current, [student.studentId]: status.value }))
                              }
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sheet?.canMark && (
          <div className="wizard-actions">
            <button type="button" className="btn-ghost" onClick={() =>
              setDraft(Object.fromEntries(sheet.students.map((s) => [s.studentId, 'present']))) }>
              Mark all present
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        )}

        {correction && (
          <div className="subject-picker">
            <strong>Correction request · {correction.studentName}</strong>
            <div className="inline-form">
              <label className="form-field">
                <span>Requested status</span>
                <select
                  value={correction.requestedStatus}
                  onChange={(event) =>
                    setCorrection((current) => ({ ...current, requestedStatus: event.target.value }))
                  }
                >
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field" style={{ flex: 1 }}>
                <span>Reason</span>
                <input
                  type="text"
                  value={correction.reason}
                  placeholder="Why should this change?"
                  onChange={(event) =>
                    setCorrection((current) => ({ ...current, reason: event.target.value }))
                  }
                />
              </label>
            </div>
            <div className="inline-form">
              <button
                type="button"
                className="btn-primary"
                disabled={correction.reason.trim().length < 5}
                onClick={async () => {
                  try {
                    await attendanceApi.requestCorrection({
                      attendanceId: correction.attendanceId,
                      requestedStatus: correction.requestedStatus,
                      reason: correction.reason,
                    });
                    setNotice({ kind: 'success', text: 'Correction request sent to the admin office.' });
                    setCorrection(null);
                  } catch (error) {
                    setNotice({
                      kind: 'error',
                      text: error.response?.data?.error?.message || 'Could not send the request.',
                    });
                  }
                }}
              >
                Send request
              </button>
              <button type="button" className="btn-ghost" onClick={() => setCorrection(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
