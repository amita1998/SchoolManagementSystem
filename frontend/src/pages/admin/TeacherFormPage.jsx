import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select } from '../../components/forms/Field.jsx';

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
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile)) next.mobile = 'Enter a valid mobile';
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
      <div className="page">
        <PageHeader title="Teacher created" subtitle="Share these credentials with the teacher." />
        <section className="section-card admission-result">
          <div className="admission-result__row"><span>Name</span><strong>{result.teacher.name}</strong></div>
          <div className="admission-result__row"><span>Employee ID</span><strong className="mono">{result.teacher.employeeId}</strong></div>
          <div className="admission-result__row"><span>Login</span><strong className="mono">{result.account.username}</strong></div>
          <div className="admission-result__row"><span>Temporary password</span><strong className="mono">{result.account.temporaryPassword}</strong></div>
          <p className="field-hint">Shown once. The teacher must change it at first sign-in.</p>
          <div className="page-head__actions">
            <Link className="btn-primary" to={`/admin/teachers/${result.teacher.id}`}>Open profile</Link>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin/teachers')}>Back to list</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Add teacher" subtitle="An account is created with a temporary password." backTo="/admin/teachers" />

      {error && <Notice kind="error" onClose={() => setError('')}>{error}</Notice>}

      <form onSubmit={submit} className="section-card stack">
        <div className="form-grid">
          <Field label="First name" required value={form.firstName} error={errors.firstName}
            onChange={(event) => set('firstName', event.target.value)} />
          <Field label="Last name" required value={form.lastName} error={errors.lastName}
            onChange={(event) => set('lastName', event.target.value)} />
          <Select label="Gender" required value={form.gender} error={errors.gender} placeholder="Select"
            onChange={(event) => set('gender', event.target.value)}
            options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          <Field label="Date of birth" type="date" value={form.dateOfBirth}
            onChange={(event) => set('dateOfBirth', event.target.value)} />
          <Field label="Mobile" required value={form.mobile} error={errors.mobile}
            onChange={(event) => set('mobile', event.target.value)} />
          <Field label="Email (login)" type="email" required value={form.email} error={errors.email}
            onChange={(event) => set('email', event.target.value)} />
          <Field label="Qualification" value={form.qualification}
            onChange={(event) => set('qualification', event.target.value)} />
          <Field label="Experience (years)" type="number" min="0" step="0.5" value={form.experienceYears}
            onChange={(event) => set('experienceYears', event.target.value)} />
          <Field label="Joining date" type="date" required value={form.joiningDate} error={errors.joiningDate}
            onChange={(event) => set('joiningDate', event.target.value)} />
          <Field label="Address" className="span-2" value={form.address}
            onChange={(event) => set('address', event.target.value)} />
        </div>

        <div className="stack">
          <div className="section-card__head">
            <h3>Subjects taught</h3>
            <button type="button" className="btn-ghost" onClick={addAssignment}>Add subject</button>
          </div>
          {assignments.length === 0 && <p className="field-hint">Optional now — you can assign subjects later.</p>}
          {assignments.map((item, index) => (
            <div className="inline-form" key={index}>
              <Select value={item.classId} placeholder="Class"
                onChange={(event) => updateAssignment(index, 'classId', event.target.value)}
                options={classOptions} />
              <Select value={item.subjectId} placeholder="Subject"
                onChange={(event) => updateAssignment(index, 'subjectId', event.target.value)}
                options={subjectOptions} />
              <button type="button" className="link-button"
                onClick={() => setAssignments((current) => current.filter((_, position) => position !== index))}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="wizard-actions">
          <Link className="btn-ghost" to="/admin/teachers">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create teacher'}
          </button>
        </div>
      </form>
    </div>
  );
}
