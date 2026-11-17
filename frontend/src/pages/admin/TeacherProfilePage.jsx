import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, StatusBadge, Notice } from '../../components/ui/PageHeader.jsx';
import { Select } from '../../components/forms/Field.jsx';
import { formatDate } from '../../utils/greeting.js';

export default function TeacherProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [options, setOptions] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [credentials, setCredentials] = useState(null);
  const [classTeacherSection, setClassTeacherSection] = useState('');
  const [newAssignment, setNewAssignment] = useState({ classId: '', subjectId: '' });

  const load = useCallback(async () => {
    try {
      const [data, opts] = await Promise.all([admin.getTeacher(id), admin.getOptions()]);
      setTeacher(data);
      setOptions(opts);
      setClassTeacherSection(data.classTeacher?.section_id || '');
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the teacher.' });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!teacher) return <p className="table-empty">Loading teacher…</p>;

  const sectionOptions = (options?.classes || []).flatMap((klass) =>
    klass.sections.map((section) => ({
      value: section.id,
      label: `${klass.name} ${section.name}`,
    })),
  );

  async function saveAssignments(items) {
    try {
      const updated = await admin.setTeacherAssignments(id, items);
      setTeacher(updated);
      setNotice({ kind: 'success', text: 'Subject assignments saved.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not save assignments.' });
    }
  }

  async function assignClassTeacher(event) {
    event.preventDefault();
    if (!classTeacherSection) return;
    try {
      const updated = await admin.assignClassTeacher(id, {
        sectionId: Number(classTeacherSection),
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
      setTeacher(updated);
      setNotice({ kind: 'success', text: 'Class teacher assigned.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not assign.' });
    }
  }

  async function resetPassword() {
    try {
      setCredentials(await admin.resetTeacherPassword(id));
      setNotice({ kind: 'success', text: 'New temporary password generated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not reset.' });
    }
  }

  async function changeStatus(status) {
    try {
      setTeacher(await admin.changeTeacherStatus(id, status));
      setNotice({ kind: 'success', text: `Status changed to ${status.replace('_', ' ')}.` });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not change status.' });
    }
  }

  async function remove() {
    if (!window.confirm('Remove this teacher? Records stay in the database (soft delete).')) return;
    try {
      await admin.deleteTeacher(id);
      navigate('/admin/teachers');
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove.' });
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={teacher.name}
        subtitle={`Employee ${teacher.employeeId} · ${teacher.email}`}
        backTo="/admin/teachers"
        actions={
          <>
            <StatusBadge status={teacher.status} />
            <button type="button" className="btn-ghost" onClick={resetPassword}>Reset password</button>
            <button type="button" className="btn-danger" onClick={remove}>Remove</button>
          </>
        }
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>
      {credentials && (
        <Notice kind="success">
          Login <strong className="mono">{credentials.username}</strong> · temporary password{' '}
          <strong className="mono">{credentials.temporaryPassword}</strong> (shown once)
        </Notice>
      )}

      <div className="dash__grid">
        <section className="section-card">
          <h3>Profile</h3>
          <dl className="profile-facts">
            <div><dt>Employee ID</dt><dd className="mono">{teacher.employeeId}</dd></div>
            <div><dt>Mobile</dt><dd>{teacher.mobile}</dd></div>
            <div><dt>Qualification</dt><dd>{teacher.qualification || '—'}</dd></div>
            <div><dt>Experience</dt><dd>{teacher.experienceYears ? `${teacher.experienceYears} years` : '—'}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(teacher.joiningDate)}</dd></div>
            <div><dt>Date of birth</dt><dd>{formatDate(teacher.dateOfBirth)}</dd></div>
          </dl>
        </section>

        <section className="section-card">
          <h3>Class teacher</h3>
          {teacher.classTeacher ? (
            <div className="stack">
              <p>
                Class teacher of <strong>{teacher.classTeacher.class_name} {teacher.classTeacher.section_name}</strong> from{' '}
                {formatDate(teacher.classTeacher.effective_from)}.
              </p>
              <button type="button" className="btn-ghost"
                onClick={async () => {
                  try {
                    setTeacher(await admin.clearClassTeacher(id));
                    setClassTeacherSection('');
                    setNotice({ kind: 'success', text: 'Class teacher role removed.' });
                  } catch (error) {
                    setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove.' });
                  }
                }}>
                Remove class teacher role
              </button>
            </div>
          ) : (
            <form onSubmit={assignClassTeacher} className="stack">
              <Select label="Assign to section" value={classTeacherSection} placeholder="Select section"
                onChange={(event) => setClassTeacherSection(event.target.value)} options={sectionOptions} />
              <button type="submit" className="btn-primary" disabled={!classTeacherSection}>Assign</button>
              <p className="field-hint">A section has one class teacher, and a teacher can hold only one section.</p>
            </form>
          )}

          <h3 className="mt-20">Status</h3>
          <div className="inline-form">
            {['active', 'on_leave', 'resigned'].map((value) => (
              <button key={value} type="button" className={`chip ${teacher.status === value ? 'is-active' : ''}`}
                onClick={() => changeStatus(value)}>
                {value.replace('_', ' ')}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="section-card">
        <h3>Subjects taught</h3>
        {teacher.assignments.length === 0 ? (
          <p className="table-empty">No subjects assigned yet.</p>
        ) : (
          <ul className="file-list">
            {teacher.assignments.map((item) => (
              <li key={item.id}>
                <i className="bi bi-journal-text" aria-hidden="true" />
                <span>{item.class_name}</span>
                <span className="muted">{item.subject_name}</span>
                <button type="button" className="link-button"
                  onClick={() =>
                    saveAssignments(
                      teacher.assignments
                        .filter((row) => row.id !== item.id)
                        .map((row) => ({ classId: row.class_id, subjectId: row.subject_id })),
                    )
                  }>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="inline-form">
          <Select value={newAssignment.classId} placeholder="Class"
            onChange={(event) => setNewAssignment((c) => ({ ...c, classId: event.target.value }))}
            options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
          <Select value={newAssignment.subjectId} placeholder="Subject"
            onChange={(event) => setNewAssignment((c) => ({ ...c, subjectId: event.target.value }))}
            options={(options?.subjects || []).map((subject) => ({ value: subject.id, label: subject.name }))} />
          <button type="button" className="btn-ghost" disabled={!newAssignment.classId || !newAssignment.subjectId}
            onClick={() => {
              const items = [
                ...teacher.assignments.map((row) => ({ classId: row.class_id, subjectId: row.subject_id })),
                { classId: Number(newAssignment.classId), subjectId: Number(newAssignment.subjectId) },
              ];
              saveAssignments(items);
              setNewAssignment({ classId: '', subjectId: '' });
            }}>
            Add subject
          </button>
        </div>
      </section>
    </div>
  );
}
