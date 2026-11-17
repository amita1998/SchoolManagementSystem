import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import authService from '../../services/auth.js';
import { homeFor } from '../../routes/roles.js';
import '../../styles/auth.css';

export default function ChangePasswordPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const forced = Boolean(user?.mustChangePassword);

  function validate() {
    const errors = {};
    if (!currentPassword) errors.currentPassword = 'Enter your current password';
    if (!newPassword) errors.newPassword = 'Choose a new password';
    else if (newPassword.length < 8) errors.newPassword = 'At least 8 characters';
    else if (!/[A-Z]/.test(newPassword)) errors.newPassword = 'Add one uppercase letter';
    else if (!/[a-z]/.test(newPassword)) errors.newPassword = 'Add one lowercase letter';
    else if (!/[0-9]/.test(newPassword)) errors.newPassword = 'Add one digit';
    if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match';
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
      await authService.changePassword({ currentPassword, newPassword, confirmPassword });
      const refreshed = await refreshUser();
      navigate(homeFor(refreshed.user.role), { replace: true });
    } catch (error) {
      const payload = error.response?.data?.error;
      if (payload?.fields) setFieldErrors(payload.fields);
      setFormError(payload?.message || 'Could not change the password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card--narrow">
        <section className="auth-form">
          <header className="auth-form__head">
            <span className="auth-eyebrow">Account security</span>
            <h2>{forced ? 'Set a new password' : 'Change your password'}</h2>
            <p>
              {forced
                ? 'Your account still uses the temporary password issued by the school office.'
                : 'Choose a password you have not used here before.'}
            </p>
          </header>

          {forced && (
            <div className="help-box">
              <strong>Why am I seeing this?</strong>
              <span>
                Temporary passwords must be replaced before you can use the system. Signing you
                out elsewhere is automatic.
              </span>
            </div>
          )}

          {formError && (
            <div className="form-alert" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="currentPassword">Current password</label>
              <div className={`input-wrap ${fieldErrors.currentPassword ? 'has-error' : ''}`}>
                <i className="bi bi-lock" aria-hidden="true" />
                <input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              {fieldErrors.currentPassword && (
                <p className="field-error">{fieldErrors.currentPassword}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="newPassword">New password</label>
              <div className={`input-wrap ${fieldErrors.newPassword ? 'has-error' : ''}`}>
                <i className="bi bi-shield-lock" aria-hidden="true" />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
                </button>
              </div>
              {fieldErrors.newPassword ? (
                <p className="field-error">{fieldErrors.newPassword}</p>
              ) : (
                <p className="field-hint">At least 8 characters with one uppercase, one lowercase and one digit.</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <div className={`input-wrap ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                <i className="bi bi-shield-check" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="field-error">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button type="submit" className="btn-signin" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save new password'}
            </button>

            {!forced && (
              <button
                type="button"
                className="link-button link-button--center"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
              >
                Sign out instead
              </button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
