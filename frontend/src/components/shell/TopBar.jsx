import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
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
      </div>

      <div className="topbar__right">
        <span className="topbar__date">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {formatToday(today)}
        </span>

        <NotificationBell unreadNotifications={unreadNotifications} onRead={onNotificationsRead} />
      </div>
    </header>
  );
}
