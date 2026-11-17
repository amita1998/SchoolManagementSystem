import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as comms from '../../services/comms.js';

const TONE = { announcement: 'bi-megaphone', assignment: 'bi-journal-plus', fee: 'bi-receipt', attendance: 'bi-calendar2-check', exam: 'bi-journal-text' };

/**
 * The bell in the top bar. The unread count comes from the dashboard payload; the list itself is
 * fetched only when the popover opens, and marking a row read refreshes that count through `onRead`.
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
        <div className="popover popover--wide" role="dialog" aria-label="Notifications">
          <div className="popover__head">
            <strong>Notifications</strong>
            {counts.unread > 0 && (
              <button type="button" className="link-button" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>

          {error && <p className="popover__error">{error}</p>}
          {!rows && !error && <p className="muted">Loading…</p>}
          {rows && rows.length === 0 && <p className="muted">Nothing yet.</p>}

          {rows && rows.length > 0 && (
            <ul className="notif-list">
              {rows.map((row) => (
                <li key={row.id} className={row.read_at ? 'is-read' : 'is-unread'}>
                  <button type="button" className="notif" onClick={() => follow(row)}>
                    <i className={`bi ${TONE[row.type] || 'bi-bell'}`} aria-hidden="true" />
                    <span>
                      <strong>{row.title}</strong>
                      {row.body && <span className="muted">{row.body}</span>}
                      <span className="notif__meta">{row.created_label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <span className="popover__foot">
            {counts.total ? `${counts.unread} unread of ${counts.total}` : 'Notifications are created by announcements and assignments.'}
          </span>
        </div>
      )}
    </div>
  );
}
