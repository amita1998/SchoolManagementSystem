import { useEffect, useState } from 'react';
import { api } from './services/api.js';

/**
 * Step 1 placeholder screen.
 * It exists to prove the three layers are wired: browser -> Vite proxy -> Express -> PostgreSQL.
 * Step 3 replaces it with the real layout shell and role dashboards.
 */
export default function App() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    api
      .get('/health')
      .then(({ data }) => {
        if (!cancelled) setHealth({ state: 'ok', payload: data.data });
      })
      .catch((error) => {
        if (!cancelled) setHealth({ state: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">VVS</div>
        <h1>Vision Valley School</h1>
        <p className="setup-sub">School Management System — project setup complete</p>

        <div className={`setup-status setup-status--${health.state}`}>
          {health.state === 'loading' && 'Checking API and database…'}
          {health.state === 'ok' && (
            <>
              <strong>API + database connected</strong>
              <span>
                {health.payload.name} · {health.payload.environment} · db “{health.payload.database.database}”
              </span>
              <span>Server time (IST): {health.payload.database.server_time}</span>
            </>
          )}
          {health.state === 'error' && (
            <>
              <strong>API not reachable</strong>
              <span>{health.message}</span>
              <span>Start it with: cd backend &amp;&amp; npm run dev</span>
            </>
          )}
        </div>

        <ul className="setup-next">
          <li>Step 1 — setup, schema, migrations, seed: done</li>
          <li>Step 2 — authentication, roles, login page</li>
          <li>Step 3 — layout shell and four dashboards</li>
        </ul>
      </div>
    </main>
  );
}
