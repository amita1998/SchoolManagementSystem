import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, StatusBadge, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';
import { formatDate } from '../../utils/greeting.js';
import { digitsOnly, isValidMobile, MOBILE_MESSAGE, mobileInputProps } from '../../utils/phone.js';

const STATUSES = [
  ['active', 'Active'],
  ['on_leave', 'On leave'],
  ['resigned', 'Resigned'],
];

const formatStamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The edit form works on one flat draft; the API speaks the same names. */
function buildDraft(teacher) {
  return {
    firstName: teacher.firstName || '',
    lastName: teacher.lastName || '',
    gender: teacher.gender || '',
    dateOfBirth: teacher.dateOfBirth ? String(teacher.dateOfBirth).slice(0, 10) : '',
    mobile: teacher.mobile || '',
    email: teacher.email || teacher.login?.email || '',
    qualification: teacher.qualification || '',
    experienceYears:
      teacher.experienceYears === null || teacher.experienceYears === undefined
        ? ''
        : String(teacher.experienceYears),
    joiningDate: teacher.joiningDate ? String(teacher.joiningDate).slice(0, 10) : '',
    address: teacher.address || '',
    status: teacher.status || 'active',
  };
}

export default function TeacherProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [options, setOptions] = useState(null);
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [credentials, setCredentials] = useState(null);
  const [classTeacherSection, setClassTeacherSection] = useState('');
  const [newAssignment, setNewAssignment] = useState({ classId: '', subjectId: '' });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

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

  if (!teacher) {
    return (
      <div className="page">
        <div className="list-loading">
          <span className="spinner" aria-hidden="true" />
          <span>Loading teacher…</span>
        </div>
      </div>
    );
  }

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

  function startEdit() {
    setDraft(buildDraft(teacher));
    setEditErrors({});
    setEditing(true);
  }

  function setField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validateDraft() {
    const next = {};
    if (!draft.firstName.trim()) next.firstName = 'Required';
    if (!draft.lastName.trim()) next.lastName = 'Required';
    if (!draft.gender) next.gender = 'Select a gender';
    if (!draft.joiningDate) next.joiningDate = 'Required';
    if (!isValidMobile(draft.mobile)) next.mobile = MOBILE_MESSAGE;
    if (!EMAIL_PATTERN.test(draft.email.trim())) next.email = 'Enter a valid email (it is the login)';
    if (draft.experienceYears !== '' && (Number(draft.experienceYears) < 0 || Number(draft.experienceYears) > 60)) {
      next.experienceYears = 'Between 0 and 60';
    }
    setEditErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Send only what changed, so the audit row is a real diff. */
  function buildPayload() {
    const payload = {};
    const put = (key, value, current) => {
      if (String(value ?? '') !== String(current ?? '')) payload[key] = value;
    };
    put('firstName', draft.firstName.trim(), teacher.firstName);
    put('lastName', draft.lastName.trim(), teacher.lastName);
    put('gender', draft.gender, teacher.gender);
    put('dateOfBirth', draft.dateOfBirth || null, String(teacher.dateOfBirth || '').slice(0, 10));
    put('mobile', draft.mobile, teacher.mobile);
    put('email', draft.email.trim().toLowerCase(), teacher.email || teacher.login?.email || '');
    put('qualification', draft.qualification.trim() || null, teacher.qualification);
    put('joiningDate', draft.joiningDate, String(teacher.joiningDate || '').slice(0, 10));
    put('address', draft.address.trim() || null, teacher.address);
    put('status', draft.status, teacher.status);
    const experience = draft.experienceYears === '' ? null : Number(draft.experienceYears);
    if (String(experience ?? '') !== String(teacher.experienceYears ?? '')) payload.experienceYears = experience;
    return payload;
  }

  async function saveEdits(event) {
    event.preventDefault();
    if (!validateDraft()) return;

    const payload = buildPayload();
    if (Object.keys(payload).length === 0) {
      setEditing(false);
      setNotice({ kind: 'info', text: 'Nothing changed.' });
      return;
    }

    setSaving(true);
    try {
      const updated = await admin.updateTeacher(id, payload);
      setTeacher(updated);
      setDraft(buildDraft(updated));
      setEditing(false);
      setNotice({ kind: 'success', text: 'Teacher details updated.' });
    } catch (error) {
      const body = error.response?.data?.error;
      if (body?.fields) setEditErrors(body.fields);
      setNotice({ kind: 'error', text: body?.message || 'Could not save the changes.' });
    } finally {
      setSaving(false);
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

  const initials = `${teacher.firstName?.charAt(0) || ''}${teacher.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="page teacher-profile">
      <PageHeader
        title="Teacher profile"
        subtitle="Employment record, teaching load, class teacher role and login."
        backTo="/admin/teachers"
        actions={
          <>
            {!editing && (
              <button type="button" className="btn-primary" onClick={startEdit}>
                <i className="bi bi-pencil-square" aria-hidden="true" /> Edit details
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={resetPassword}>
              <i className="bi bi-key" aria-hidden="true" /> Reset password
            </button>
            <button type="button" className="btn-danger" onClick={remove}>
              <i className="bi bi-trash3" aria-hidden="true" /> Remove
            </button>
          </>
        }
      />

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>{notice.text}</Notice>

      {credentials && (
        <div className="credential-strip">
          <span className="credential-strip__label">
            <i className="bi bi-shield-lock" aria-hidden="true" /> New credentials
          </span>
          <span className="credential-strip__pair">
            <span className="credential-strip__key">Login</span>
            <strong className="mono">{credentials.username}</strong>
          </span>
          <span className="credential-strip__pair">
            <span className="credential-strip__key">Temporary password</span>
            <strong className="mono">{credentials.temporaryPassword}</strong>
          </span>
          <span className="credential-strip__note">Shown once · the teacher must change it at first sign-in.</span>
        </div>
      )}

      {editing && draft && (
        <section className="section-card">
          <div className="section-card__head">
            <h3>Edit details</h3>
            <span className="muted">Only the fields you change are written to the audit log.</span>
          </div>
          <form className="stack" onSubmit={saveEdits}>
            <div className="edit-group">
              <h4>Personal</h4>
              <div className="form-grid">
                <Field label="First name" required value={draft.firstName} error={editErrors.firstName}
                  onChange={(event) => setField('firstName', event.target.value)} />
                <Field label="Last name" required value={draft.lastName} error={editErrors.lastName}
                  onChange={(event) => setField('lastName', event.target.value)} />
                <Select label="Gender" required value={draft.gender} placeholder="Select"
                  error={editErrors.gender}
                  onChange={(event) => setField('gender', event.target.value)} options={GENDERS} />
                <Field label="Date of birth" type="date" value={draft.dateOfBirth} error={editErrors.dateOfBirth}
                  onChange={(event) => setField('dateOfBirth', event.target.value)} />
                <Field label="Mobile" required value={draft.mobile} error={editErrors.mobile}
                  {...mobileInputProps}
                  onChange={(event) => setField('mobile', digitsOnly(event.target.value))}
                  hint="10 digits — a second teacher cannot use the same number" />
              </div>
            </div>

            <div className="edit-group">
              <h4>Login &amp; contact</h4>
              <div className="form-grid">
                <Field label="Email (login)" required type="email" value={draft.email} error={editErrors.email}
                  onChange={(event) => setField('email', event.target.value)}
                  hint="Changing this renames the teacher's login — the old address stops working" />
                <Field label="Address" value={draft.address}
                  onChange={(event) => setField('address', event.target.value)} />
              </div>
            </div>

            <div className="edit-group">
              <h4>Employment</h4>
              <div className="form-grid">
                <Field label="Qualification" value={draft.qualification}
                  onChange={(event) => setField('qualification', event.target.value)} />
                <Field label="Experience (years)" type="number" min="0" max="60" step="0.5"
                  value={draft.experienceYears} error={editErrors.experienceYears}
                  onChange={(event) => setField('experienceYears', event.target.value)} />
                <Field label="Joining date" required type="date" value={draft.joiningDate} error={editErrors.joiningDate}
                  onChange={(event) => setField('joiningDate', event.target.value)} />
                <Select label="Status" value={draft.status} error={editErrors.status}
                  onChange={(event) => setField('status', event.target.value)}
                  options={STATUSES.map(([value, label]) => ({ value, label }))} />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="section-card profile-hero">
        <span className="profile-hero__avatar" aria-hidden="true">{initials}</span>
        <div className="profile-hero__body">
          <div className="profile-hero__title">
            <h2>{teacher.name}</h2>
            <StatusBadge status={teacher.status} />
          </div>
          <div className="summary-chips">
            <span className="summary-chip">
              <strong className="mono">{teacher.employeeId}</strong> employee ID
            </span>
            <span className="summary-chip">
              <strong>{teacher.email}</strong> login
            </span>
          </div>
          <dl className="profile-hero__facts">
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(teacher.joiningDate)}</dd>
            </div>
            <div>
              <dt>Class teacher</dt>
              <dd>{teacher.classTeacherOf || <span className="muted">Not assigned</span>}</dd>
            </div>
            <div>
              <dt>Subjects</dt>
              <dd>{teacher.assignments.length}</dd>
            </div>
            <div>
              <dt>Last login</dt>
              <dd>{teacher.login?.last_login_at ? formatStamp(teacher.login.last_login_at) : 'Never'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="dash__grid">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Profile facts</h3>
            <span className="muted">Employment record</span>
          </div>
          <dl className="profile-facts">
            <div><dt>Employee ID</dt><dd className="mono">{teacher.employeeId}</dd></div>
            <div><dt>Mobile</dt><dd className="mono">{teacher.mobile}</dd></div>
            <div><dt>Qualification</dt><dd>{teacher.qualification || 'Not recorded'}</dd></div>
            <div><dt>Experience</dt><dd>{teacher.experienceYears ? `${teacher.experienceYears} years` : 'Not recorded'}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(teacher.joiningDate)}</dd></div>
            <div><dt>Date of birth</dt><dd>{formatDate(teacher.dateOfBirth)}</dd></div>
            <div className="span-2"><dt>Address</dt><dd>{teacher.address || 'Not recorded'}</dd></div>
          </dl>
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <h3>Login</h3>
            <span className="muted">Staff account</span>
          </div>
          <dl className="profile-facts profile-facts--single">
            <div><dt>Username</dt><dd className="mono">{teacher.login?.username || 'No login'}</dd></div>
            <div>
              <dt>Account</dt>
              <dd>
                {teacher.login ? (
                  <span className={`status-badge status-badge--${teacher.login.is_active ? 'mint' : 'coral'}`}>
                    {teacher.login.is_active ? 'active' : 'disabled'}
                  </span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div><dt>Last login</dt><dd>{teacher.login ? formatStamp(teacher.login.last_login_at) : '—'}</dd></div>
            <div>
              <dt>Password</dt>
              <dd>{teacher.login ? (teacher.login.must_change_password ? 'Must change at sign-in' : 'Set by the teacher') : '—'}</dd>
            </div>
            <div className="span-2"><dt>Email</dt><dd>{teacher.login?.email || teacher.email}</dd></div>
          </dl>
          <p className="field-hint">
            Reset password issues a one-time temporary password; it is shown once and never stored in plain text.
          </p>
        </section>
      </div>

      <div className="dash__grid">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Class teacher</h3>
            <span className="muted">{teacher.classTeacher ? 'Assigned' : 'Not assigned'}</span>
          </div>
          {teacher.classTeacher ? (
            <div className="stack">
              <div className="callout-fact">
                <span className="callout-fact__label">Class teacher of</span>
                <strong>{teacher.classTeacher.class_name} {teacher.classTeacher.section_name}</strong>
                <span className="muted">from {formatDate(teacher.classTeacher.effective_from)}</span>
              </div>
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
                <i className="bi bi-x-circle" aria-hidden="true" /> Remove class teacher role
              </button>
            </div>
          ) : (
            <form onSubmit={assignClassTeacher} className="stack">
              <Select label="Assign to section" name="classTeacherSection" value={classTeacherSection} placeholder="Select section"
                onChange={(event) => setClassTeacherSection(event.target.value)} options={sectionOptions} />
              <p className="field-hint">A section has one class teacher, and a teacher can hold only one section.</p>
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={!classTeacherSection}>Assign</button>
              </div>
            </form>
          )}
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <h3>Status</h3>
            <span className="muted">Takes effect immediately</span>
          </div>
          <div className="status-switch">
            {STATUSES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="status-switch__option"
                aria-pressed={teacher.status === value}
                onClick={() => changeStatus(value)}
              >
                <i
                  className={`bi ${teacher.status === value ? 'bi-check-circle-fill' : 'bi-circle'}`}
                  aria-hidden="true"
                />
                {label}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Status changes take effect immediately and are recorded against your account.
          </p>
        </section>
      </div>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Subjects taught</h3>
          <span className="muted">
            {teacher.assignments.length} {teacher.assignments.length === 1 ? 'assignment' : 'assignments'} this year
          </span>
        </div>

        {teacher.assignments.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-journal-text" aria-hidden="true" /></span>
            <strong>No subjects assigned yet</strong>
            <span>Pick a class and a subject below to add the first assignment.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table assign-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {teacher.assignments.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Class">{item.class_name}</td>
                    <td data-label="Subject">{item.subject_name}</td>
                    <td className="align-right" data-label="Actions">
                      <span className="row-actions">
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
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="inline-form">
          <Select aria-label="Class for the new assignment" value={newAssignment.classId} placeholder="Class"
            onChange={(event) => setNewAssignment((c) => ({ ...c, classId: event.target.value }))}
            options={(options?.classes || []).map((klass) => ({ value: klass.id, label: klass.name }))} />
          <Select aria-label="Subject for the new assignment" value={newAssignment.subjectId} placeholder="Subject"
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
            <i className="bi bi-plus-lg" aria-hidden="true" /> Add subject
          </button>
        </div>
      </section>
    </div>
  );
}
