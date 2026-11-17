import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import Field, { Select, TextArea } from '../../components/forms/Field.jsx';

const STEPS = [
  { key: 'basic', label: 'Basic details' },
  { key: 'admission', label: 'Admission' },
  { key: 'parents', label: 'Parent / guardian' },
  { key: 'documents', label: 'Documents' },
  { key: 'review', label: 'Review' },
];

const emptyParent = () => ({
  fullName: '',
  relationship: 'father',
  mobile: '',
  email: '',
  occupation: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  isPrimary: true,
});

export default function StudentAdmissionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    previousSchool: '',
    classId: '',
    sectionId: '',
    rollNo: '',
    createLogin: true,
    parents: [emptyParent()],
  });
  const [files, setFiles] = useState([]);

  useEffect(() => {
    admin.getOptions().then(setOptions).catch(() => setFormError('Could not load classes.'));
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setParent = (index, key, value) =>
    setForm((current) => {
      const parents = [...current.parents];
      parents[index] = { ...parents[index], [key]: value };
      return { ...current, parents };
    });

  const sections = useMemo(() => {
    const klass = options?.classes.find((item) => String(item.id) === String(form.classId));
    return klass?.sections || [];
  }, [options, form.classId]);

  function validateStep(index) {
    const next = {};
    if (index === 0) {
      if (!form.firstName.trim()) next.firstName = 'Required';
      if (!form.lastName.trim()) next.lastName = 'Required';
      if (!form.gender) next.gender = 'Select a gender';
      if (!form.dateOfBirth) next.dateOfBirth = 'Required';
      else if (form.dateOfBirth >= new Date().toISOString().slice(0, 10)) {
        next.dateOfBirth = 'Date of birth must be in the past';
      }
    }
    if (index === 1) {
      if (!form.classId) next.classId = 'Select a class';
      if (!form.sectionId) next.sectionId = 'Select a section';
      if (!form.admissionDate) next.admissionDate = 'Required';
    }
    if (index === 2) {
      form.parents.forEach((parent, position) => {
        if (!parent.fullName.trim()) next[`parents.${position}.fullName`] = 'Required';
        if (!/^[0-9+\-\s]{7,15}$/.test(parent.mobile)) next[`parents.${position}.mobile`] = 'Enter a valid mobile';
        if (parent.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parent.email)) {
          next[`parents.${position}.email`] = 'Enter a valid email';
        }
      });
    }
    if (index === 3) {
      files.forEach((item, position) => {
        if (item.file.size > 5 * 1024 * 1024) next[`file.${position}`] = 'Maximum 5 MB';
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function submit() {
    for (let index = 0; index < 4; index += 1) {
      if (!validateStep(index)) {
        setStep(index);
        return;
      }
    }
    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bloodGroup: form.bloodGroup || null,
        admissionDate: form.admissionDate,
        previousSchool: form.previousSchool || null,
        classId: Number(form.classId),
        sectionId: Number(form.sectionId),
        rollNo: form.rollNo === '' ? null : Number(form.rollNo),
        createLogin: form.createLogin,
        parents: form.parents.map((parent) => ({
          ...parent,
          fullName: parent.fullName.trim(),
          email: parent.email || undefined,
          isPrimary: Boolean(parent.isPrimary),
        })),
      };
      const created = await admin.createStudent(payload, files);
      setResult(created);
    } catch (error) {
      const payload = error.response?.data?.error;
      if (payload?.fields) setErrors(payload.fields);
      setFormError(payload?.message || 'Could not complete the admission.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page">
        <PageHeader title="Admission complete" subtitle="Hand this slip to the parent." />
        <section className="section-card admission-result">
          <div className="admission-result__row">
            <span>Student</span>
            <strong>{result.student.name}</strong>
          </div>
          <div className="admission-result__row">
            <span>Admission ID</span>
            <strong className="mono">{result.student.admissionId}</strong>
          </div>
          <div className="admission-result__row">
            <span>Class</span>
            <strong>
              {result.student.className} {result.student.sectionName}
            </strong>
          </div>
          {result.account && (
            <>
              <div className="admission-result__row">
                <span>Login (student)</span>
                <strong className="mono">{result.account.username}</strong>
              </div>
              <div className="admission-result__row">
                <span>Temporary password</span>
                <strong className="mono">{result.account.temporaryPassword}</strong>
              </div>
              <p className="field-hint">
                This password is shown once. The student must change it at first sign-in.
              </p>
            </>
          )}
          <div className="page-head__actions">
            <Link className="btn-primary" to={`/admin/students/${result.student.id}`}>
              Open profile
            </Link>
            <button type="button" className="btn-ghost" onClick={() => window.print()}>
              Print slip
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/admin/students')}>
              Back to list
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="New admission"
        subtitle="Five steps: details, placement, guardians, documents, review."
        backTo="/admin/students"
      />

      <ol className="steps">
        {STEPS.map((item, index) => (
          <li key={item.key} className={index === step ? 'is-active' : index < step ? 'is-done' : ''}>
            <span className="steps__index">{index < step ? '✓' : index + 1}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ol>

      {formError && <Notice kind="error" onClose={() => setFormError('')}>{formError}</Notice>}

      <section className="section-card">
        {step === 0 && (
          <div className="form-grid">
            <Field label="First name" name="firstName" required value={form.firstName}
              error={errors.firstName} onChange={(e) => set('firstName', e.target.value)} />
            <Field label="Last name" name="lastName" required value={form.lastName}
              error={errors.lastName} onChange={(e) => set('lastName', e.target.value)} />
            <Select label="Gender" name="gender" required value={form.gender}
              error={errors.gender} placeholder="Select"
              onChange={(e) => set('gender', e.target.value)}
              options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
            <Field label="Date of birth" name="dateOfBirth" type="date" required
              value={form.dateOfBirth} error={errors.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)} />
            <Select label="Blood group" name="bloodGroup" value={form.bloodGroup}
              placeholder="Not known" onChange={(e) => set('bloodGroup', e.target.value)}
              options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({ value: v, label: v }))} />
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <Select label="Class" name="classId" required value={form.classId} error={errors.classId}
              placeholder="Select class"
              onChange={(e) => { set('classId', e.target.value); set('sectionId', ''); }}
              options={(options?.classes || []).map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Section" name="sectionId" required value={form.sectionId} error={errors.sectionId}
              placeholder={form.classId ? 'Select section' : 'Choose a class first'}
              disabled={!form.classId}
              onChange={(e) => set('sectionId', e.target.value)}
              options={sections.map((s) => ({ value: s.id, label: `${s.name} · ${s.students}/${s.capacity}` }))} />
            <Field label="Admission date" name="admissionDate" type="date" required
              value={form.admissionDate} error={errors.admissionDate}
              onChange={(e) => set('admissionDate', e.target.value)} />
            <Field label="Roll number" name="rollNo" type="number" min="0" value={form.rollNo}
              onChange={(e) => set('rollNo', e.target.value)} hint="Optional" />
            <Field label="Previous school" name="previousSchool" className="span-2"
              value={form.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} />
            <p className="field-hint span-2">
              Academic year: <strong>{options?.currentYear?.name || 'not configured'}</strong>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            {form.parents.map((parent, index) => (
              <div className="parent-card" key={index}>
                <header>
                  <strong>Guardian {index + 1}</strong>
                  {form.parents.length > 1 && (
                    <button type="button" className="link-button"
                      onClick={() => set('parents', form.parents.filter((_, i) => i !== index))}>
                      Remove
                    </button>
                  )}
                </header>
                <div className="form-grid">
                  <Field label="Full name" required value={parent.fullName}
                    error={errors[`parents.${index}.fullName`]}
                    onChange={(e) => setParent(index, 'fullName', e.target.value)} />
                  <Select label="Relationship" value={parent.relationship}
                    onChange={(e) => setParent(index, 'relationship', e.target.value)}
                    options={[{ value: 'father', label: 'Father' }, { value: 'mother', label: 'Mother' }, { value: 'guardian', label: 'Guardian' }]} />
                  <Field label="Mobile" required value={parent.mobile}
                    error={errors[`parents.${index}.mobile`]}
                    onChange={(e) => setParent(index, 'mobile', e.target.value)}
                    hint="Used as the family login when no email is given" />
                  <Field label="Email" type="email" value={parent.email}
                    error={errors[`parents.${index}.email`]}
                    onChange={(e) => setParent(index, 'email', e.target.value)} />
                  <Field label="Occupation" value={parent.occupation}
                    onChange={(e) => setParent(index, 'occupation', e.target.value)} />
                  <Field label="Address" value={parent.addressLine}
                    onChange={(e) => setParent(index, 'addressLine', e.target.value)} />
                  <Field label="City" value={parent.city}
                    onChange={(e) => setParent(index, 'city', e.target.value)} />
                  <Field label="State" value={parent.state}
                    onChange={(e) => setParent(index, 'state', e.target.value)} />
                  <Field label="PIN code" value={parent.pincode}
                    onChange={(e) => setParent(index, 'pincode', e.target.value)} />
                </div>
              </div>
            ))}
            {form.parents.length < 3 && (
              <button type="button" className="btn-ghost"
                onClick={() => set('parents', [...form.parents, { ...emptyParent(), isPrimary: false }])}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Add another guardian
              </button>
            )}
            <Notice kind="info">
              A guardian whose mobile or email already exists is linked to the same family account —
              siblings share one login.
            </Notice>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <Field label="Documents" hint="PDF, JPG or PNG · up to 5 MB each" />
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => {
                const picked = Array.from(event.target.files || []).map((file) => ({
                  file,
                  docType: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
                }));
                setFiles(picked);
              }} />
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((item, index) => (
                  <li key={`${item.file.name}-${index}`}>
                    <i className="bi bi-file-earmark" aria-hidden="true" />
                    <span>{item.file.name}</span>
                    <span className="muted">{Math.round(item.file.size / 1024)} KB</span>
                    {errors[`file.${index}`] && <span className="field-error">{errors[`file.${index}`]}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="field-hint">Documents are optional at admission; they can be added later from the profile.</p>
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <div className="review-grid">
              <div>
                <span>Student</span>
                <strong>
                  {form.firstName} {form.lastName}
                </strong>
              </div>
              <div>
                <span>Date of birth</span>
                <strong>{form.dateOfBirth}</strong>
              </div>
              <div>
                <span>Class</span>
                <strong>
                  {options?.classes.find((c) => String(c.id) === String(form.classId))?.name}{' '}
                  {sections.find((s) => String(s.id) === String(form.sectionId))?.name}
                </strong>
              </div>
              <div>
                <span>Admission date</span>
                <strong>{form.admissionDate}</strong>
              </div>
              <div>
                <span>Guardians</span>
                <strong>{form.parents.map((p) => p.fullName).join(', ')}</strong>
              </div>
              <div>
                <span>Documents</span>
                <strong>{files.length}</strong>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={form.createLogin}
                onChange={(e) => set('createLogin', e.target.checked)} />
              <span>Create the student login now (username = Admission ID, temporary password)</span>
            </label>
            <p className="field-hint">
              The Admission ID is generated by the database and can never be edited or reused.
            </p>
          </div>
        )}

        <div className="wizard-actions">
          <button type="button" className="btn-ghost" disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}>
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm admission'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
