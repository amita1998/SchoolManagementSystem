import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/shell/Sidebar.jsx';
import TopBar from '../components/shell/TopBar.jsx';
import { useDashboard } from '../hooks/useDashboard.js';
import '../styles/shell.css';

function LoadingBlock() {
  return (
    <div className="loading-block" aria-live="polite" aria-busy="true">
      <div className="skeleton skeleton--banner" />
      <div className="skeleton-row">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
      <div className="skeleton skeleton--table" />
    </div>
  );
}

function ErrorBlock({ message, onRetry }) {
  return (
    <div className="error-block" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <strong>We could not load your dashboard</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/**
 * Two-zone shell: sidebar + centre column. The dashboard payload is fetched here so
 * the top bar (date, notification bell) always shows the same data as the centre column —
 * one request per screen. The old right-hand calendar/reminders/notices panel is gone.
 */
export default function DashboardLayout({ role }) {
  const [childId, setChildId] = useState(null);
  const { status, data, error, reload } = useDashboard(role, { childId });

  return (
    <div className={`shell shell--${role}`}>
      <Sidebar role={role} />

      <main className="shell__main">
        <TopBar
          today={data?.today?.today}
          unreadNotifications={data?.shell?.unreadNotifications ?? 0}
          onNotificationsRead={reload}
        />
        <div className="shell__content">
          {status === 'error' ? (
            <ErrorBlock message={error} onRetry={reload} />
          ) : status === 'loading' ? (
            <LoadingBlock />
          ) : (
            <Outlet context={{ data, reload, childId, setChildId }} />
          )}
        </div>
      </main>
    </div>
  );
}
