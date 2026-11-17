import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';
import { digitsOnly, isValidMobile, MOBILE_MESSAGE, mobileInputProps } from '../../utils/phone.js';

export default function TeacherFormPage() {
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    mobile: '',
    email: '',
    address: '',
    qualification: '',
    experienceYears: '',
    joiningDate: new Date().toISOString().slice(0, 10),
  });
  const [assignments, setAssignments] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    admin.getOptions().then(setOptions).catch(() => setError('Could not load classes.'));
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const classOptions = useMemo(
    () => (options?.classes || []).map((item) => ({ value: item.id, label: item.name })),
    [options],
  );
  const subjectOptions = useMemo(
    () => (options?.subjects || []).map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })),
    [options],
  );

  function addAssignment() {
    setAssignments((current) => [...current, { classId: '', subjectId: '' }]);
  }

  function updateAssignment(index, key, value) {
    setAssignments((current) =>
      current.map((item, position) => (position === index ? { ...item, [key]: value } : item)),
    );
  }

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    if (!form.gender) next.gender = 'Select a gender';
    if (!isValidMobile(form.mobile)) next.mobile = MOBILE_MESSAGE;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = 'Enter a valid email';
    if (!form.joiningDate) next.joiningDate = 'Required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await admin.createTeacher({
        ...form,
        experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
        dateOfBirth: form.dateOfBirth || null,
        assignments: assignments
          .filter((item) => item.classId && item.subjectId)
          .map((item) => ({ classId: Number(item.classId), subjectId: Number(item.subjectId) })),
      });
      setResult(created);
    } catch (requestError) {
      const payload = requestError.response?.data?.error;
      if (payload?.fields) setErrors(payload.fields);
      setError(payload?.message || 'Could not create the teacher.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page teacher-form">
        <PageHeader title="Teacher created" subtitle="Share these credentials with the teacher." />
        <section className="section-card admission-slip">
          <header className="admission-slip__head">
            <div>
              <span className="admission-slip__brand">Vision Valley International School</span>
              <h3>Staff credential slip</h3>
            </div>
            <span className="admission-slip__stamp">
              <i className="bi bi-check-circle" aria-hidden="true" /> Created
            </span>
          </header>

          <dl className="admission-slip__rows">
            <div className="admission-slip__row">
              <dt>Name</dt>
              <dd>{result.teacher.name}</dd>
            </div>
            <div className="admission-slip__row">
              <dt>Employee ID</dt>
              <dd className="mono">{result.teacher.employeeId}</dd>
            </div>
          </dl>

          <div className="admission-slip__credentials">
            <span className="admission-slip__credentials-head">
              <i className="bi bi-shield-lock" aria-hidden="true" /> Staff login
            </span>
            <div className="admission-slip__credential">
              <span>Username</span>
              <strong className="mono">{result.account.username}</strong>
            </div>
            <div className="admission-slip__credential">
              <span>Temporary password</span>
              <strong className="mono">{result.account.temporaryPassword}</strong>
            </div>
            <p className="admission-slip__note">
              Shown once. The teacher must change it at first sign-in.
            </p>
          </div>

          <footer className="admission-slip__foot">
            <span className="admission-slip__hint">
              <i className="bi bi-printer" aria-hidden="true" /> Print this slip for the staff file.
            </span>
            <div className="page-head__actions">
              <button type="button" className="btn-ghost" onClick={() => window.print()}>
                <i className="bi bi-printer" aria-hidden="true" /> Print slip
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigate('/admin/teachers')}>
                Back to list
              </button>
              <Link className="btn-primary" to={`/admin/teachers/${result.teacher.id}`}>
                Open profile
              </Link>
            </div>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div className="page teacher-form">
      <PageHeader title="Add teacher" subtitle="An account is created with a temporary password." backTo="/admin/teachers" />

      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}

      <form onSubmit={submit} className="teacher-form__form">
        <section className="section-card">
          <div className="section-card__head">
            <div>
              <h3>Personal</h3>
              <p className="muted">As printed on the appointment letter.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="First name" name="firstName" required value={form.firstName} error={errors.firstName}
              onChange={(event) => set('firstName', event.target.value)} />
            <Field label="Last name" name="lastName" required value={form.lastName} error={errors.lastName}
              onChange={(event) => set('lastName', event.target.value)} />
            <Select label="Gender" name="gender" required value={form.gender} error={errors.gender} placeholder="Select"
              onChange={(event) => set('gender', event.target.value)}
              options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
            <Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth}
              onChange={(event) => set('dateOfBirth', event.target.value)} hint="Optional" />
          </div>
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <div>
              <h3>Contact</h3>
              <p className="muted">The email address becomes the teacher’s login.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Mobile" name="mobile" required value={form.mobile} error={errors.mobile}
              {...mobileInputProps}
              onChange={(event) => set('mobile', digitsOnly(event.target.value))}
              hint="10 digits, no spaces" />
            <Field label="Email (login)" name="email" type="email" required value={form.email} error={errors.email}
              onChange={(event) => set('email', event.target.value)} />
            <Field label="Address" name="address" className="span-2" value={form.address}
              onChange={(event) => set('address', event.target.value)} />
          </div>
        </section>

        <section className="section-card">
          <div className="section-card__head">
            <div>
              <h3>Employment</h3>
              <p className="muted">Used for the staff register and workload reports.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Qualification" name="qualification" value={form.qualification}
              onChange={(event) => set('qualification', event.target.value)} />
            <Field label="Experience (years)" name="experienceYears" type="number" min="0" step="0.5"
              value={form.experienceYears}
              onChange={(event) => set('experienceYears', event.target.value)} />
            <Field label="Joining date" name="joiningDate" type="date" required value={form.joiningDate}
              error={errors.joiningDate}
              onChange={(event) => set('joiningDate', event.target.value)} />
          </div>
        </section>

        <section className="section-card teacher-form__assignments">
          <div className="section-card__head">
            <div>
              <h3>Subjects taught</h3>
              <p className="muted">Optional now — assignments can be added later from the profile.</p>
            </div>
            <button type="button" className="btn-ghost btn--sm section-card__action" onClick={addAssignment}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add subject
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon"><i className="bi bi-journal-text" aria-hidden="true" /></span>
              <strong>No subjects added</strong>
              <span>Pick a class and a subject to build the timetable rows for this teacher.</span>
              <button type="button" className="btn-ghost empty-state__action" onClick={addAssignment}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add subject
              </button>
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
                  {assignments.map((item, index) => (
                    <tr key={index}>
                      <td data-label="Class">
                        <Select aria-label={`Class for subject ${index + 1}`} value={item.classId} placeholder="Select class"
                          onChange={(event) => updateAssignment(index, 'classId', event.target.value)}
                          options={classOptions} />
                      </td>
                      <td data-label="Subject">
                        <Select aria-label={`Subject for row ${index + 1}`} value={item.subjectId} placeholder="Select subject"
                          onChange={(event) => updateAssignment(index, 'subjectId', event.target.value)}
                          options={subjectOptions} />
                      </td>
                      <td className="align-right" data-label="Actions">
                        <span className="row-actions">
                          <button type="button" className="link-button"
                            onClick={() => setAssignments((current) => current.filter((_, position) => position !== index))}>
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

        <div className="form-actions form-actions--sticky teacher-form__actions">
          <span className="form-actions__note">
            <i className="bi bi-asterisk" aria-hidden="true" /> Fields marked * are required.
          </span>
          <Link className="btn-ghost" to="/admin/teachers">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create teacher'}
          </button>
        </div>
      </form>
    </div>
  );
}
