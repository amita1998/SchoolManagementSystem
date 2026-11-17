import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../routes/roles.js';
import '../styles/auth.css';

export default function UnauthorizedPage() {
  const { status, user } = useAuth();
  const backTo = status === 'authenticated' && user ? homeFor(user.role) : '/login';

  return (
    <main className="auth-page">
      <div className="auth-card auth-card--narrow">
        <section className="auth-form auth-form--center">
          <span className="state-icon state-icon--warn">
            <i className="bi bi-shield-exclamation" aria-hidden="true" />
          </span>
          <span className="auth-eyebrow">Access restricted</span>
          <h2>You don’t have access to that page</h2>
          <p className="state-copy">
            Your role does not include this section. If you think this is a mistake, contact the
            school office.
          </p>
          <Link className="btn-primary auth-action" to={backTo}>
            Go back to my dashboard
          </Link>
        </section>
      </div>
    </main>
  );
}
