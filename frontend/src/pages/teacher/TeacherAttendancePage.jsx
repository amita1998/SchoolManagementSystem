import { useCallback, useEffect, useState } from 'react';
import * as attendanceApi from '../../services/attendance.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const STATUSES = [
  { value: 'present', label: 'P', title: 'Present' },
  { value: 'absent', label: 'A', title: 'Absent' },
  { value: 'late', label: 'L', title: 'Late' },
  { value: 'half_day', label: 'H', title: 'Half day' },
  { value: 'leave', label: 'Lv', title: 'Leave' },
];

const STATUS_TONE = {
  present: 'mint',
  absent: 'coral',
  late: 'amber',
  half_day: 'blue',
  leave: 'purple',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-17" -> "17 Nov 2026" without going through Date (no timezone shift). */
function dateLabel(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 3) return value || '—';
  const [year, month, day] = parts;
  const label = MONTHS[Number(month) - 1];
  return label ? `${day} ${label} ${year}` : value;
}

function statusText(status) {
  return String(status || 'not marked').replace(/_/g, ' ');
}

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

  if (state === 'error') {
    return (
      <div className="page">
        <Notice kind="error">Could not load your sections.</Notice>
      </div>
    );
  }

  if (state === 'ready' && sections.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Mark attendance" subtitle="Marking is limited to class teachers." />
        <section className="section-card">
          <EmptyState
            icon="bi-calendar2-x"
            title="No section to mark"
            text="You are not a class teacher of any section, so there is no attendance to mark. Subject teachers can still see the attendance of their classes from the dashboard."
          />
        </section>
      </div>
    );
  }

  const students = sheet?.students || [];
  const counts = STATUSES.map((status) => ({
    ...status,
    total: students.filter((student) => (draft[student.studentId] || student.status) === status.value).length,
  })).filter((status) => status.total > 0);

  return (
    <div className="page">
      <PageHeader
        title="Mark attendance"
        subtitle="Only the class teacher of a section can mark it, once per day, until 11:59 PM."
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      <section className="section-card">
        <div className="section-card__head">
          <div>
            <h3>
              {sheet ? `${sheet.section.class_name} · Section ${sheet.section.section_name}` : 'Attendance sheet'}
            </h3>
            <span className="muted">
              {sheet?.section?.class_teacher
                ? `Class teacher ${sheet.section.class_teacher}`
                : 'Loading the sheet…'}
            </span>
          </div>
          {sheet && (
            <span className={`status-badge status-badge--${sheet.locked ? 'amber' : 'mint'}`}>
              {sheet.locked ? 'Locked' : 'Open for marking'}
            </span>
          )}
        </div>

        <div className="filters">
          <div className="filter-row">
            <select
              aria-label="Section"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
            >
              {sections.map((item) => (
                <option key={item.section_id} value={item.section_id}>
                  {item.class_name} {item.section_name}
                </option>
              ))}
            </select>
          </div>

          {sheet && (
            <div className="summary-chips">
              <span className="summary-chip">
                Date <strong>{dateLabel(sheet.date)}</strong>
              </span>
              <span className="summary-chip">
                <strong>{sheet.students.length}</strong> student{sheet.students.length === 1 ? '' : 's'}
              </span>
            </div>
          )}

          <p className="field-hint">{sheet?.locked ? 'this day is closed' : 'open until 11:59 PM'}</p>
        </div>

        <div className="section-card__body">
          {sheet?.locked && (
            <Notice kind="error">
              This day is locked. Submit a correction request instead of marking it again.
            </Notice>
          )}

          {sheet && students.length > 0 && (
            <div className="summary-chips">
              {counts.map((status) => (
                <span key={status.value} className="summary-chip">
                  <strong>{status.total}</strong> {status.title.toLowerCase()}
                </span>
              ))}
            </div>
          )}

          {sheet && students.length === 0 && (
            <EmptyState
              icon="bi-people"
              title="No students in this section"
              text="Once students are enrolled in this section they appear here for marking."
            />
          )}

          {sheet && students.length > 0 && (
            <div className="table-wrap">
              <table className="data-table attendance-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Admission ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.studentId}>
                      <td data-label="Student">{student.name}</td>
                      <td data-label="Admission ID" className="mono">{student.admissionId}</td>
                      <td data-label="Status">
                        {sheet.locked ? (
                          <div className="inline-form">
                            <span
                              className={`status-badge status-badge--${STATUS_TONE[student.status] || 'blue'}`}
                            >
                              {statusText(student.status)}
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
                          <div className="status-buttons" role="group" aria-label={`Status for ${student.name}`}>
                            {STATUSES.map((status) => (
                              <button
                                key={status.value}
                                type="button"
                                title={status.title}
                                aria-pressed={draft[student.studentId] === status.value}
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
        </div>

        {sheet?.canMark && (
          <div className="form-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setDraft(Object.fromEntries(sheet.students.map((s) => [s.studentId, 'present'])))}
            >
              <i className="bi bi-check2-all" aria-hidden="true" />
              Mark all present
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        )}

        {correction && (
          <div className="mt-20">
            <div className="section-card__head">
              <h3>Correction request · {correction.studentName}</h3>
              <span className="muted">The office reviews every correction.</span>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="correction-status">Requested status</label>
                <select
                  id="correction-status"
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
              </div>
              <div className="form-field">
                <label htmlFor="correction-reason">Reason</label>
                <input
                  id="correction-reason"
                  type="text"
                  value={correction.reason}
                  placeholder="Why should this change?"
                  onChange={(event) =>
                    setCorrection((current) => ({ ...current, reason: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setCorrection(null)}>
                Cancel
              </button>
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
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
