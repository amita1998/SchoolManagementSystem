import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL } from '../../routes/roles.js';
import NotificationBell from './NotificationBell.jsx';

function formatToday(isoDate) {
  if (!isoDate) return '';
  // Dates arrive as 'YYYY-MM-DD'; build the label in UTC so the day never shifts.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Presentation only: the session carries a username/email, not a display name. */
function displayNameOf(user) {
  const handle = user?.username || user?.email || '';
  if (!handle) return 'Signed in';
  return handle.includes('@') ? handle.split('@')[0] : handle;
}

function initialsOf(user) {
  const handle = user?.username || user?.email || '';
  const parts = handle
    .replace(/@.*$/, '')
    .split(/[.\-_\s]+/)
    .filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return (letters.join('') || '?').toUpperCase();
}

export default function TopBar({ today, unreadNotifications = 0, onNotificationsRead }) {
  const [term, setTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSearchStudents = user?.role === 'admin';

  function submitSearch(event) {
    if (event.key !== 'Enter' || !canSearchStudents) return;
    const value = term.trim();
    navigate(value ? `/admin/students?search=${encodeURIComponent(value)}` : '/admin/students');
  }

  return (
    <header className="topbar">
      <div className="topbar__search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          placeholder={canSearchStudents ? 'Search by name or admission ID…' : 'Search'}
          aria-label="Search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={submitSearch}
          disabled={!canSearchStudents}
          title={canSearchStudents ? 'Press Enter to open the student list' : 'Search lives on each page'}
        />
        {canSearchStudents && (
          <kbd className="topbar__search-key" aria-hidden="true">
            Enter
          </kbd>
        )}
      </div>

      <div className="topbar__right">
        <span className="topbar__date">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {formatToday(today)}
        </span>

        <NotificationBell unreadNotifications={unreadNotifications} onRead={onNotificationsRead} />

        <div className="topbar__user">
          <span className="topbar__avatar" aria-hidden="true">
            {initialsOf(user)}
          </span>
          <span className="topbar__user-text">
            <span className="topbar__user-name">{displayNameOf(user)}</span>
            <span className="topbar__user-role">{ROLE_LABEL[user?.role] || 'Account'}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
