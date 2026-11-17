import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, StatusBadge, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';
import { formatDate } from '../../utils/greeting.js';
import { digitsOnly, isValidMobile, MOBILE_MESSAGE, mobileInputProps } from '../../utils/phone.js';

const STATUS_OPTIONS = [
  'active',
  'new_admission',
  'promoted',
  'academic_year_renewed',
  'graduated',
  'transferred',
  'withdrawn',
  'suspended',
].map((value) => ({ value, label: value.replace(/_/g, ' ') }));

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((value) => ({
  value,
  label: value,
}));

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The edit form works on a flat draft; the API speaks the same names. */
function buildDraft(student) {
  return {
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender || '',
    dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : '',
    bloodGroup: student.bloodGroup || '',
    previousSchool: student.previousSchool || '',
    classId: student.classId ? String(student.classId) : '',
    sectionId: student.sectionId ? String(student.sectionId) : '',
    rollNo: student.rollNo === null || student.rollNo === undefined ? '' : String(student.rollNo),
    guardians: (student.parents || []).map((parent) => ({
      id: parent.id,
      name: parent.full_name,
      mobile: parent.mobile || '',
      email: parent.email || '',
      occupation: parent.occupation || '',
      addressLine: parent.address_line || '',
      city: parent.city || '',
      state: parent.state || '',
      pincode: parent.pincode || '',
    })),
  };
}

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState(null);
  const [state, setState] = useState('loading');
  const [notice, setNotice] = useState({ kind: 'info', text: '' });
  const [statusForm, setStatusForm] = useState({
    status: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });
  const [credentials, setCredentials] = useState(null);
  const [files, setFiles] = useState([]);
  const [options, setOptions] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [guardianCredentials, setGuardianCredentials] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await admin.getStudent(id);
      setStudent(data);
      setState('ready');
    } catch (error) {
      setState('error');
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not load the student.' });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // "/admin/students/12?edit=1" (the Edit link in the list) opens the editor directly.
  const wantsEdit = searchParams.get('edit') === '1';
  useEffect(() => {
    if (wantsEdit && state === 'ready' && !editing) startEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsEdit, state]);

  const classOptions = useMemo(
    () => (options?.classes || []).map((item) => ({ value: item.id, label: item.name })),
    [options],
  );
  const sectionOptions = useMemo(() => {
    const klass = options?.classes.find((item) => String(item.id) === String(draft?.classId));
    return (klass?.sections || []).map((item) => ({
      value: item.id,
      label: `${item.name} · ${item.students}/${item.capacity}`,
    }));
  }, [options, draft?.classId]);

  if (state === 'loading') {
    return (
      <div className="page">
        <div className="list-loading">
          <span className="spinner" aria-hidden="true" />
          <span>Loading student…</span>
        </div>
      </div>
    );
  }
  if (!student) return <Notice kind="error">{notice.text}</Notice>;

  async function startEdit() {
    setDraft(buildDraft(student));
    setEditErrors({});
    setEditing(true);
    if (!options) {
      admin.getOptions().then(setOptions).catch(() => {});
    }
  }

  function setDraftField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function setGuardianField(index, key, value) {
    setDraft((current) => {
      const guardians = current.guardians.map((guardian, position) =>
        position === index ? { ...guardian, [key]: value } : guardian,
      );
      return { ...current, guardians };
    });
  }

  function validateDraft() {
    const next = {};
    if (!draft.firstName.trim()) next.firstName = 'Required';
    if (!draft.lastName.trim()) next.lastName = 'Required';
    if (!draft.gender) next.gender = 'Select a gender';
    if (!draft.dateOfBirth) next.dateOfBirth = 'Required';
    else if (draft.dateOfBirth >= new Date().toISOString().slice(0, 10)) {
      next.dateOfBirth = 'Date of birth must be in the past';
    }
    if (draft.classId && !draft.sectionId) next.sectionId = 'Pick a section for that class';
    draft.guardians.forEach((guardian, index) => {
      if (!isValidMobile(guardian.mobile)) next[`guardian.${index}.mobile`] = MOBILE_MESSAGE;
      if (guardian.email && !EMAIL_PATTERN.test(guardian.email)) {
        next[`guardian.${index}.email`] = 'Enter a valid email';
      }
      if (guardian.pincode && !/^\d{4,10}$/.test(guardian.pincode)) {
        next[`guardian.${index}.pincode`] = 'Digits only';
      }
    });
    setEditErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Send only what actually changed — the audit row then shows a real diff. */
  function buildPayload() {
    const payload = {};
    const put = (key, value, current) => {
      if (String(value ?? '') !== String(current ?? '')) payload[key] = value;
    };

    put('firstName', draft.firstName.trim(), student.firstName);
    put('lastName', draft.lastName.trim(), student.lastName);
    put('gender', draft.gender, student.gender);
    put('dateOfBirth', draft.dateOfBirth, String(student.dateOfBirth || '').slice(0, 10));
    put('bloodGroup', draft.bloodGroup || null, student.bloodGroup);
    put('previousSchool', draft.previousSchool.trim() || null, student.previousSchool);

    const rollNo = draft.rollNo === '' ? null : Number(draft.rollNo);
    if (String(rollNo ?? '') !== String(student.rollNo ?? '')) payload.rollNo = rollNo;

    if (draft.classId && String(draft.classId) !== String(student.classId ?? '')) {
      payload.classId = Number(draft.classId);
    }
    if (draft.sectionId && String(draft.sectionId) !== String(student.sectionId ?? '')) {
      payload.sectionId = Number(draft.sectionId);
    }

    const guardians = draft.guardians
      .map((guardian) => {
        const original = (student.parents || []).find((parent) => parent.id === guardian.id) || {};
        const changed = {};
        const compare = (key, value, current) => {
          if (String(value ?? '') !== String(current ?? '')) changed[key] = value;
        };
        compare('mobile', guardian.mobile, original.mobile);
        compare('email', guardian.email.trim(), original.email);
        compare('occupation', guardian.occupation.trim(), original.occupation);
        compare('addressLine', guardian.addressLine.trim(), original.address_line);
        compare('city', guardian.city.trim(), original.city);
        compare('state', guardian.state.trim(), original.state);
        compare('pincode', guardian.pincode.trim(), original.pincode);
        return Object.keys(changed).length ? { id: guardian.id, ...changed } : null;
      })
      .filter(Boolean);
    if (guardians.length) payload.guardians = guardians;

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
      const updated = await admin.updateStudent(id, payload);
      setStudent(updated);
      setDraft(buildDraft(updated));
      setEditing(false);
      setNotice({ kind: 'success', text: 'Student details updated.' });
    } catch (error) {
      const body = error.response?.data?.error;
      if (body?.fields) setEditErrors(body.fields);
      setNotice({ kind: 'error', text: body?.message || 'Could not save the changes.' });
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(event) {
    event.preventDefault();
    if (!statusForm.status) return;
    try {
      await admin.changeStudentStatus(id, statusForm);
      setNotice({ kind: 'success', text: 'Status updated and recorded in the history.' });
      setStatusForm((current) => ({ ...current, status: '', remarks: '' }));
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not change the status.' });
    }
  }

  async function resetPassword() {
    try {
      const result = await admin.resetStudentPassword(id);
      setCredentials(result);
      setNotice({ kind: 'success', text: 'A new temporary password was generated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not reset the password.' });
    }
  }

  async function resetGuardian(parent) {
    try {
      const result = await admin.resetGuardianPassword(id, parent.id);
      setGuardianCredentials(result);
      setNotice({
        kind: 'success',
        text: `New temporary password for ${result.guardian} — hand it over, it is shown once.`,
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error.response?.data?.error?.message || 'Could not reset the guardian password.',
      });
    }
  }

  async function remove() {
    if (!window.confirm('Remove this student? Records stay in the database (soft delete).')) return;
    try {
      await admin.deleteStudent(id);
      navigate('/admin/students');
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Could not remove the student.' });
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!files.length) return;
    try {
      await admin.addStudentDocuments(
        id,
        Array.from(files).map((file) => ({ file, docType: file.name.replace(/\.[^.]+$/, '') })),
      );
      setFiles([]);
      event.target.reset();
      setNotice({ kind: 'success', text: 'Documents uploaded.' });
      load();
    } catch (error) {
      setNotice({ kind: 'error', text: error.response?.data?.error?.message || 'Upload failed.' });
    }
  }

  const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`.toUpperCase();
  const primaryGuardian = student.parents.find((parent) => parent.is_primary) || student.parents[0];

  return (
    <div className="page student-profile">
      <PageHeader
        title="Student profile"
        subtitle="Identity, placement, guardians and documents for the current academic year."
        backTo="/admin/students"
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

      <Notice kind={notice.kind} onClose={() => setNotice({ kind: 'info', text: '' })}>
        {notice.text}
      </Notice>

      {guardianCredentials && (
        <div className="credential-strip">
          <span className="credential-strip__label">
            <i className="bi bi-person-badge" aria-hidden="true" /> Guardian login
          </span>
          <span className="credential-strip__pair">
            <span className="credential-strip__key">Login</span>
            <strong className="mono">{guardianCredentials.username}</strong>
          </span>
          <span className="credential-strip__pair">
            <span className="credential-strip__key">Temporary password</span>
            <strong className="mono">{guardianCredentials.temporaryPassword}</strong>
          </span>
          <span className="credential-strip__note">Shown once · the parent must change it at first sign-in.</span>
        </div>
      )}

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
          <span className="credential-strip__note">Shown once · the student must change it at first sign-in.</span>
        </div>
      )}

      <section className="section-card profile-hero">
        <span className="profile-hero__avatar" aria-hidden="true">{initials}</span>
        <div className="profile-hero__body">
          <div className="profile-hero__title">
            <h2>{student.name}</h2>
            <StatusBadge status={student.status} />
          </div>
          <div className="summary-chips">
            <span className="summary-chip">
              <strong className="mono">{student.admissionId}</strong> admission ID
            </span>
            <span className="summary-chip">
              <strong>
                {student.className
                  ? `${student.className}${student.sectionName ? ` · ${student.sectionName}` : ''}`
                  : 'Not enrolled'}
              </strong>{' '}
              class
            </span>
          </div>
          <dl className="profile-hero__facts">
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDate(student.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Primary guardian</dt>
              <dd>{primaryGuardian ? primaryGuardian.full_name : <span className="muted">Not linked</span>}</dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd>{student.documents.length}</dd>
            </div>
            <div>
              <dt>Status changes</dt>
              <dd>{student.statusHistory.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {editing && draft && (
        <section className="section-card student-editor">
          <div className="section-card__head">
            <div>
              <h3>Edit details</h3>
              <p className="muted">Only the fields you change are saved to the audit log.</p>
            </div>
            <span className="section-card__action badge-soft">
              <i className="bi bi-pencil" aria-hidden="true" /> Editing
            </span>
          </div>

          <form className="student-editor__form" onSubmit={saveEdits}>
            <div className="form-section">
              <div className="form-section__head">
                <h4>Student</h4>
                <p>Name and personal details as printed on the admission record.</p>
              </div>
              <div className="form-grid">
                <Field label="First name" name="firstName" required value={draft.firstName}
                  error={editErrors.firstName}
                  onChange={(event) => setDraftField('firstName', event.target.value)} />
                <Field label="Last name" name="lastName" required value={draft.lastName}
                  error={editErrors.lastName}
                  onChange={(event) => setDraftField('lastName', event.target.value)} />
                <Select
                  label="Gender"
                  name="gender"
                  required
                  value={draft.gender}
                  placeholder="Select"
                  error={editErrors.gender}
                  onChange={(event) => setDraftField('gender', event.target.value)}
                  options={GENDER_OPTIONS}
                />
                <Field label="Date of birth" name="dateOfBirth" type="date" required
                  value={draft.dateOfBirth} error={editErrors.dateOfBirth}
                  onChange={(event) => setDraftField('dateOfBirth', event.target.value)} />
                <Select
                  label="Blood group"
                  name="bloodGroup"
                  value={draft.bloodGroup}
                  placeholder="Not known"
                  onChange={(event) => setDraftField('bloodGroup', event.target.value)}
                  options={BLOOD_GROUP_OPTIONS}
                />
                <Field label="Previous school" name="previousSchool" value={draft.previousSchool}
                  hint="Leave blank for a first admission."
                  onChange={(event) => setDraftField('previousSchool', event.target.value)} />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section__head">
                <h4>Placement</h4>
                <p>Class, section and roll number for the current academic year.</p>
              </div>
              <div className="form-grid">
                <Select
                  label="Class"
                  name="classId"
                  value={draft.classId}
                  placeholder="Not enrolled"
                  error={editErrors.classId}
                  onChange={(event) => {
                    setDraftField('classId', event.target.value);
                    setDraftField('sectionId', '');
                  }}
                  options={classOptions}
                />
                <Select
                  label="Section"
                  name="sectionId"
                  value={draft.sectionId}
                  placeholder={draft.classId ? 'Select section' : 'Choose a class first'}
                  disabled={!draft.classId}
                  error={editErrors.sectionId}
                  onChange={(event) => setDraftField('sectionId', event.target.value)}
                  options={sectionOptions}
                />
                <Field label="Roll number" name="rollNo" type="number" min="0" max="999"
                  value={draft.rollNo} error={editErrors.rollNo}
                  hint="Position in the section register."
                  onChange={(event) => setDraftField('rollNo', event.target.value)} />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section__head">
                <h4>Guardians</h4>
                <p>Contact details used for the family login and school communication.</p>
              </div>
              <div className="form-section__body">
                {draft.guardians.map((guardian, index) => (
                  <div className="guardian-card" key={guardian.id}>
                    <div className="guardian-card__head">
                      <span className="guardian-card__avatar" aria-hidden="true">
                        {guardian.name.charAt(0)}
                      </span>
                      <div>
                        <strong>{guardian.name}</strong>
                        <span className="muted">Guardian</span>
                      </div>
                    </div>
                    <div className="form-grid">
                      <Field label="Mobile" name={`guardian-${index}-mobile`} required
                        value={guardian.mobile}
                        error={editErrors[`guardian.${index}.mobile`]}
                        hint="10 digits · also the family login when there is no email"
                        {...mobileInputProps}
                        onChange={(event) => setGuardianField(index, 'mobile', digitsOnly(event.target.value))} />
                      <Field label="Email" name={`guardian-${index}-email`} type="email"
                        value={guardian.email}
                        error={editErrors[`guardian.${index}.email`]}
                        onChange={(event) => setGuardianField(index, 'email', event.target.value)} />
                      <Field label="Occupation" name={`guardian-${index}-occupation`}
                        value={guardian.occupation}
                        onChange={(event) => setGuardianField(index, 'occupation', event.target.value)} />
                      <Field label="Address" name={`guardian-${index}-address`}
                        value={guardian.addressLine}
                        onChange={(event) => setGuardianField(index, 'addressLine', event.target.value)} />
                      <Field label="City" name={`guardian-${index}-city`} value={guardian.city}
                        onChange={(event) => setGuardianField(index, 'city', event.target.value)} />
                      <Field label="State" name={`guardian-${index}-state`} value={guardian.state}
                        onChange={(event) => setGuardianField(index, 'state', event.target.value)} />
                      <Field label="PIN code" name={`guardian-${index}-pincode`} value={guardian.pincode}
                        maxLength={10} inputMode="numeric"
                        error={editErrors[`guardian.${index}.pincode`]}
                        onChange={(event) => setGuardianField(index, 'pincode', digitsOnly(event.target.value, 10))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions form-actions--sticky">
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

      <div className="dash__grid">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Profile facts</h3>
            <span className="muted">{student.className ? 'Enrolled this year' : 'Not enrolled'}</span>
          </div>
          <dl className="profile-facts">
            <div><dt>Admission ID</dt><dd className="mono">{student.admissionId}</dd></div>
            <div>
              <dt>Class / section</dt>
              <dd>
                {student.className
                  ? `${student.className}${student.sectionName ? ` · ${student.sectionName}` : ''}`
                  : 'Not enrolled'}
              </dd>
            </div>
            <div><dt>Date of birth</dt><dd>{formatDate(student.dateOfBirth)}</dd></div>
            <div>
              <dt>Gender</dt>
              <dd>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : 'Not recorded'}</dd>
            </div>
            <div><dt>Blood group</dt><dd>{student.bloodGroup || 'Not recorded'}</dd></div>
            <div><dt>Admission date</dt><dd>{formatDate(student.admissionDate)}</dd></div>
            <div><dt>Previous school</dt><dd>{student.previousSchool || 'Not recorded'}</dd></div>
            <div><dt>Roll number</dt><dd>{student.rollNo ?? 'Not assigned'}</dd></div>
            <div><dt>Login</dt><dd className="mono">{student.login?.username || 'No login'}</dd></div>
            <div>
              <dt>Login status</dt>
              <dd>{student.login ? (student.login.is_active ? 'Active' : 'Disabled') : 'Not created'}</dd>
            </div>
          </dl>
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <h3>Change status</h3>
            <span className="head-status">
              <span className="muted">Current</span>
              <StatusBadge status={student.status} />
            </span>
          </div>
          <form onSubmit={applyStatus} className="stack">
            <Select label="New status" name="status" value={statusForm.status} placeholder="Select status"
              onChange={(e) => setStatusForm((c) => ({ ...c, status: e.target.value }))}
              options={STATUS_OPTIONS} />
            <Field label="Effective date" name="effectiveDate" type="date"
              value={statusForm.effectiveDate}
              hint="Back-date a change to keep the history accurate."
              onChange={(e) => setStatusForm((c) => ({ ...c, effectiveDate: e.target.value }))} />
            <Field label="Remarks" name="remarks" type="text"
              value={statusForm.remarks} placeholder="Reason (kept in history)"
              onChange={(e) => setStatusForm((c) => ({ ...c, remarks: e.target.value }))} />
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={!statusForm.status}>
                Apply status
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="dash__grid">
        <section className="section-card">
          <div className="section-card__head">
            <h3>Parents / guardians</h3>
            <span className="muted">
              {student.parents.length} {student.parents.length === 1 ? 'guardian' : 'guardians'} linked
            </span>
          </div>
          {student.parents.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-people" aria-hidden="true" /></span>
              <strong>No guardian linked</strong>
              <span>Add a guardian through Edit details.</span>
            </div>
          ) : (
            <ul className="people-list">
              {student.parents.map((parent) => (
                <li key={parent.id}>
                  <span className="people-list__avatar">{parent.full_name.charAt(0)}</span>
                  <div>
                    <strong>{parent.full_name}</strong>
                    <span>
                      {parent.relationship} · {parent.mobile}
                      {parent.email ? ` · ${parent.email}` : ''}
                    </span>
                    <span>
                      {[parent.address_line, parent.city, parent.state, parent.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span className="row-actions">
                    {parent.user_id && (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => resetGuardian(parent)}
                        title={`Issue a new temporary password for ${parent.full_name}'s login`}
                      >
                        Reset password
                      </button>
                    )}
                    <span className={`status-badge status-badge--${parent.user_id ? 'mint' : 'coral'}`}>
                      {parent.user_id ? 'account' : 'no account'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <h3>Status history</h3>
            <span className="muted">
              {student.statusHistory.length} {student.statusHistory.length === 1 ? 'change' : 'changes'}
            </span>
          </div>
          {student.statusHistory.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-clock-history" aria-hidden="true" /></span>
              <strong>No changes yet</strong>
              <span>Status changes appear here with their effective date.</span>
            </div>
          ) : (
            <ul className="history-list">
              {student.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span className="history-list__dot" />
                  <div>
                    <strong>
                      {String(entry.from_status || 'new').replace(/_/g, ' ')} →{' '}
                      {String(entry.to_status).replace(/_/g, ' ')}
                    </strong>
                    <span>
                      {formatDate(entry.effective_date)}
                      {entry.changed_by ? ` · ${entry.changed_by}` : ''}
                    </span>
                    {entry.remarks && <span className="muted">{entry.remarks}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section-card">
        <div className="section-card__head">
          <h3>Documents</h3>
          <span className="muted">{student.documents.length} on file</span>
        </div>
        {student.documents.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><i className="bi bi-folder2-open" aria-hidden="true" /></span>
            <strong>No documents uploaded</strong>
            <span>Birth certificate, transfer certificate and photographs go here.</span>
          </div>
        ) : (
          <ul className="file-list">
            {student.documents.map((document) => (
              <li key={document.id}>
                <i className="bi bi-file-earmark-text" aria-hidden="true" />
                <a href={admin.documentUrl(document.id)} target="_blank" rel="noreferrer">
                  {document.file_name}
                </a>
                <span className="muted">{document.doc_type.replace(/_/g, ' ')}</span>
                <span className="file-list__date">{Math.round(document.size_bytes / 1024)} KB</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={upload} className="inline-form">
          <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
            aria-label="Choose documents to upload"
            onChange={(event) => setFiles(event.target.files || [])} />
          <button type="submit" className="btn-ghost" disabled={!files.length}>
            <i className="bi bi-upload" aria-hidden="true" /> Upload
          </button>
          <span className="field-hint">PDF, JPG, PNG · max 5 MB each</span>
        </form>
      </section>
    </div>
  );
}
