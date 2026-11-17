import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor, ROLE_LABEL } from '../routes/roles.js';
import '../styles/auth.css';

/** Temporary screen until Step 3 replaces it with the real dashboard shell. */
export default function DashboardPlaceholder({ role, title, points }) {
  const { user, logout } = useAuth();

  return (
    <div className="dash-page">
      <header className="dash-top">
        <div className="brand-top brand-top--compact">
          <div className="brand-mark">
            <i className="bi bi-mortarboard-fill" aria-hidden="true" />
          </div>
          <div className="brand-name">
            <strong>Vision Valley</strong>
            <span>School Management</span>
          </div>
        </div>
        <div className="dash-user">
          <span className="pill">{ROLE_LABEL[role]}</span>
          <span className="dash-user__name">{user?.email || user?.username}</span>
          <button
            type="button"
            className="link-button"
            onClick={async () => {
              await logout();
              window.location.assign('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-card">
          <span className="dash-eyebrow">Step 2 complete · dashboard arrives in Step 3</span>
          <h1>{title}</h1>
          <p className="dash-sub">
            Signed in as <strong>{user?.email || user?.username}</strong>. The session came from a
            short-lived access token plus an httpOnly refresh cookie; the server re-checked your
            role on every request.
          </p>

          <ul className="dash-list">
            {points.map((point) => (
              <li key={point}>
                <i className="bi bi-check2-circle" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          <div className="dash-actions">
            <Link className="btn-signin btn-signin--inline" to={homeFor(role)}>
              Stay on this dashboard
            </Link>
            <Link className="link-button" to="/change-password">
              Change password
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
