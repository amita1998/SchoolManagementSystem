import { Link } from 'react-router-dom';
import CalendarGrid from './CalendarGrid.jsx';

const NOTICE_ICON = {
  general: 'bi-info-circle',
  class_wise: 'bi-people',
  circular: 'bi-file-earmark-text',
  holiday: 'bi-sun',
  exam: 'bi-journal-text',
  event: 'bi-calendar-event',
};

export default function RightPanel({ shell, role }) {
  if (!shell) return <aside className="rightpanel" />;
  const { user, calendar, reminders = [], notices = [] } = shell;

  return (
    <aside className="rightpanel">
      <div className="profile">
        <div className="profile__avatar" aria-hidden="true">
          {user.initials}
        </div>
        <strong className="profile__name">{user.name}</strong>
        <span className="profile__role">{role}</span>
        <Link className="profile__button" to={`/${role}`} state={{ profile: true }}>
          Profile
        </Link>
      </div>

      <CalendarGrid calendar={calendar} />

      <section className="panel-section">
        <header className="panel-section__head">
          <h3>Reminders</h3>
        </header>
        <ul className="reminder-list">
          {reminders.map((reminder, index) => (
            <li key={`${reminder.text}-${index}`}>
              <span className={`reminder-dot reminder-dot--${reminder.tone || 'lavender'}`} />
              <div>
                <strong>{reminder.text}</strong>
                <span>{reminder.meta}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <header className="panel-section__head">
          <h3>Notices</h3>
          <span className="panel-section__count">{notices.length}</span>
        </header>
        {notices.length === 0 ? (
          <p className="panel-empty">No notices published yet.</p>
        ) : (
          <ul className="notice-list">
            {notices.map((notice) => (
              <li key={notice.id} className={notice.is_read ? 'is-read' : ''}>
                <i className={`bi ${NOTICE_ICON[notice.type] || 'bi-info-circle'}`} aria-hidden="true" />
                <div>
                  <strong>{notice.title}</strong>
                  <span>{notice.type.replace('_', ' ')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
