import { Link } from 'react-router-dom';
import '../styles/auth.css';

export default function NotFoundPage() {
  return (
    <main className="auth-page">
      <div className="auth-card auth-card--narrow">
        <section className="auth-form auth-form--center">
          <div className="state-icon">
            <i className="bi bi-compass" aria-hidden="true" />
          </div>
          <h2>Page not found</h2>
          <p className="state-copy">The page you opened does not exist.</p>
          <Link className="btn-signin btn-signin--inline" to="/">
            Go to the start
          </Link>
        </section>
      </div>
    </main>
  );
}
