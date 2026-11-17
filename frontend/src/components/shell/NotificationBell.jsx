import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as comms from '../../services/comms.js';

const TONE = { announcement: 'bi-megaphone', assignment: 'bi-journal-plus', fee: 'bi-receipt', attendance: 'bi-calendar2-check', exam: 'bi-journal-text' };

/**
 * The bell in the top bar. The unread count comes from the dashboard payload; the list itself is
 * fetched only when the panel opens, and marking a row read refreshes that count through `onRead`.
 */
export default function NotificationBell({ unreadNotifications = 0, onRead }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({ unread: unreadNotifications, total: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setCounts((current) => ({ ...current, unread: unreadNotifications }));
  }, [unreadNotifications]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError('');
    comms
      .notifications()
      .then((data) => {
        if (cancelled) return;
        setRows(data.notifications);
        setCounts(data.counts);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load notifications.');
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function markRead(row) {
    if (row.read_at) return;
    try {
      await comms.markNotification(row.id, true);
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, read_at: 'now' } : item)));
      setCounts((current) => ({ ...current, unread: Math.max(0, current.unread - 1) }));
      onRead?.();
    } catch {
      setError('Could not mark that notification read.');
    }
  }

  async function markAll() {
    const unread = (rows || []).filter((row) => !row.read_at);
    for (const row of unread) {
      // Sequential on purpose: the API is per-row and the badge must not overshoot.
      await markRead(row);
    }
  }

  function follow(row) {
    markRead(row);
    setOpen(false);
    if (row.link) navigate(row.link);
  }

  return (
    <div className="topbar__bell-wrap">
      <button
        type="button"
        className="topbar__bell"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${counts.unread ? `, ${counts.unread} unread` : ''}`}
        aria-expanded={open}
      >
        <i className="bi bi-bell" aria-hidden="true" />
        {counts.unread > 0 && <span className="topbar__badge">{counts.unread}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel__head">
            <span className="notif-panel__title">
              Notifications
              {counts.unread > 0 && <span className="notif-panel__count">{counts.unread} new</span>}
            </span>
            {counts.unread > 0 && (
              <button type="button" className="link-button" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notif-panel__body">
            {error && (
              <p className="notif-panel__error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}

            {!rows && !error && <p className="notif-panel__state">Loading notifications…</p>}

            {rows && rows.length === 0 && (
              <div className="empty-state">
                <span className="empty-state__icon">
                  <i className="bi bi-bell-slash" aria-hidden="true" />
                </span>
                <strong>Nothing new</strong>
                <p>Announcements, assignments and fee reminders will appear here.</p>
              </div>
            )}

            {rows && rows.length > 0 && (
              <ul className="notif-list">
                {rows.map((row) => (
                  <li key={row.id} className={row.read_at ? 'is-read' : 'is-unread'}>
                    <button type="button" className="notif" onClick={() => follow(row)}>
                      <span className="notif__icon">
                        <i className={`bi ${TONE[row.type] || 'bi-bell'}`} aria-hidden="true" />
                      </span>
                      <span className="notif__text">
                        <strong className="notif__title">{row.title}</strong>
                        {row.body && <span className="notif__body">{row.body}</span>}
                        <span className="notif__time">{row.created_label}</span>
                      </span>
                      {!row.read_at && <span className="notif__dot" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <span className="notif-panel__foot">
            {counts.total ? `${counts.unread} unread of ${counts.total}` : 'Notifications are created by announcements and assignments.'}
          </span>
        </div>
      )}
    </div>
  );
}
