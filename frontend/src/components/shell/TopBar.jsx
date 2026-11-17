import { useState } from 'react';

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

export default function TopBar({ today, unreadNotifications = 0 }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar__search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search students, teachers, receipts…"
          aria-label="Search"
          disabled
          title="Global search arrives with the student module (Step 4)"
        />
        <span className="topbar__search-hint">Step 4</span>
      </div>

      <div className="topbar__right">
        <span className="topbar__date">
          <i className="bi bi-calendar3" aria-hidden="true" />
          {formatToday(today)}
        </span>

        <div className="topbar__bell-wrap">
          <button
            type="button"
            className="topbar__bell"
            onClick={() => setOpen((value) => !value)}
            aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
            aria-expanded={open}
          >
            <i className="bi bi-bell" aria-hidden="true" />
            {unreadNotifications > 0 && <span className="topbar__badge">{unreadNotifications}</span>}
          </button>
          {open && (
            <div className="popover" role="dialog" aria-label="Notifications">
              <strong>Notifications</strong>
              <p>
                {unreadNotifications > 0
                  ? `${unreadNotifications} unread notification(s).`
                  : 'You have no unread notifications.'}
              </p>
              <span className="popover__foot">The notification centre arrives in Step 8.</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
