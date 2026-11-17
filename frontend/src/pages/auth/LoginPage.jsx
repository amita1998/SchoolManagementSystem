import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../routes/roles.js';
import '../../styles/auth.css';

const PROOF = [
  {
    icon: 'bi-people',
    title: 'Four separate dashboards',
    copy: 'Admin, teachers, students and parents each see only their own records.',
  },
  {
    icon: 'bi-calendar2-check',
    title: 'Attendance with an approval trail',
    copy: 'Marked by the class teacher, corrected by the admin office only.',
  },
  {
    icon: 'bi-journal-text',
    title: 'Results after publishing',
    copy: 'Marks stay hidden until the examination is published.',
  },
];

export default function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  if (status === 'authenticated' && user) {
    const target = user.mustChangePassword ? '/change-password' : homeFor(user.role);
    return <Navigate to={target} replace />;
  }

  function validate() {
    const errors = {};
    if (!identifier.trim()) errors.identifier = 'Enter your email, admission ID or mobile number';
    if (identifier.trim().length > 0 && identifier.trim().length < 3) {
      errors.identifier = 'That looks too short';
    }
    if (!password) errors.password = 'Enter your password';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });
      navigate(data.user.mustChangePassword ? '/change-password' : homeFor(data.user.role), {
        replace: true,
      });
    } catch (error) {
      const payload = error.response?.data?.error;
      if (payload?.fields) setFieldErrors(payload.fields);
      if (payload?.code === 'ACCOUNT_LOCKED' || payload?.code === 'ROLE_MISMATCH') {
        setFormError(payload.message);
      } else if (payload?.code === 'TOO_MANY_REQUESTS') {
        setFormError(payload.message);
      } else if (payload?.code === 'VALIDATION_ERROR') {
        setFormError('Please check the highlighted fields.');
      } else {
        setFormError(payload?.message || 'Could not sign in. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page--split">
      <aside className="auth-brand">
        <div className="brand-top">
          <span className="brand-mark">
            <i className="bi bi-mortarboard-fill" aria-hidden="true" />
          </span>
          <span className="brand-name">
            <strong>Vision Valley</strong>
            <span>School management</span>
          </span>
        </div>

        <div className="auth-brand__body">
          <h1>One place for the whole school.</h1>
          <p className="brand-copy">
            Admissions, attendance, examinations, fees and notices — secure access for every
            role, with a record of who changed what.
          </p>

          <ul className="brand-points">
            {PROOF.map((point) => (
              <li key={point.title}>
                <span className="brand-points__icon">
                  <i className={`bi ${point.icon}`} aria-hidden="true" />
                </span>
                <span className="brand-points__text">
                  <strong>{point.title}</strong>
                  <span>{point.copy}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-brand__foot">Vision Valley International School</p>
      </aside>

      <div className="auth-form-col">
        <section className="auth-card">
          <div className="auth-form">
            <header className="auth-form__head">
              <h2>Sign in</h2>
              <p>Use the credentials issued by the school office.</p>
            </header>

            {formError && (
              <div className="form-alert" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="identifier">Email, admission ID or mobile</label>
                <div className={`input-wrap ${fieldErrors.identifier ? 'has-error' : ''}`}>
                  <i className="bi bi-person" aria-hidden="true" />
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com or VVS-000001"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.identifier)}
                    aria-describedby={fieldErrors.identifier ? 'identifier-error' : 'identifier-hint'}
                  />
                </div>
                {fieldErrors.identifier ? (
                  <p className="field-error" id="identifier-error">
                    {fieldErrors.identifier}
                  </p>
                ) : (
                  <p className="field-hint" id="identifier-hint">
                    Staff email · Student admission ID · Parent mobile number
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className={`input-wrap ${fieldErrors.password ? 'has-error' : ''}`}>
                  <i className="bi bi-lock" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="field-error" id="password-error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="form-row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="link-button" onClick={() => setShowHelp((v) => !v)}>
                  Forgot password?
                </button>
              </div>

              {showHelp && (
                <div className="help-box">
                  <strong>Password resets are handled by the school office.</strong>
                  <span>
                    Call +91 20 4000 1234 or visit the admin office with your ID. The office will
                    issue a temporary password that you must change after signing in.
                  </span>
                </div>
              )}

              <button type="submit" className="btn-signin" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="auth-foot">
              Accounts are created by the school office only. Need help?{' '}
              <Link to="/login" onClick={(event) => event.preventDefault()}>
                Contact the office
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
