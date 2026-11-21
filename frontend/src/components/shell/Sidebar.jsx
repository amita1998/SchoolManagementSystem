import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigationFor } from '../../config/navigation.js';
import { ROLE_LABEL } from '../../routes/roles.js';

/**
 * Section labels for the sidebar. Purely presentational: every link still comes from
 * config/navigation.js and every permission filter still runs below. A route that is not
 * listed here (a module added later) falls into a trailing "More" group instead of vanishing.
 */
const NAV_GROUPS = {
  admin: [
    { label: 'Overview', paths: ['/admin'] },
    {
      label: 'Academics',
      paths: [
        '/admin/students',
        '/admin/teachers',
        '/admin/classes',
        '/admin/attendance',
        '/admin/examinations',
        '/admin/timetable',
        '/admin/reports',
      ],
    },
    {
      label: 'Administration',
      paths: ['/admin/fees', '/admin/library', '/admin/leave', '/admin/ptm', '/admin/events', '/admin/announcements', '/admin/settings', '/admin/audit'],
    },
  ],
  teacher: [
    { label: 'Overview', paths: ['/teacher'] },
    {
      label: 'Teaching',
      paths: [
        '/teacher/classes',
        '/teacher/students',
        '/teacher/attendance',
        '/teacher/marks',
        '/teacher/assignments',
        '/teacher/timetable',
        '/teacher/library',
        '/teacher/leave',
        '/teacher/ptm',
      ],
    },
    { label: 'School', paths: ['/teacher/events', '/teacher/notices'] },
  ],
  student: [
    { label: 'Overview', paths: ['/student'] },
    {
      label: 'Academics',
      paths: ['/student/attendance', '/student/results', '/student/assignments', '/student/timetable'],
    },
    { label: 'School', paths: ['/student/fees', '/student/ptm', '/student/events', '/student/notices'] },
  ],
  parent: [
    { label: 'Overview', paths: ['/parent'] },
    {
      label: 'My child',
      paths: [
        '/parent/children',
        '/parent/attendance',
        '/parent/results',
        '/parent/fees',
        '/parent/assignments',
        '/parent/timetable',
        '/parent/ptm',
      ],
    },
    { label: 'School', paths: ['/parent/events', '/parent/notices'] },
  ],
};

function groupItems(role, items) {
  const definition = NAV_GROUPS[role] || [];
  const buckets = definition.map((group) => ({ label: group.label, items: [] }));
  const leftover = { label: 'More', items: [] };

  items.forEach((item) => {
    const index = definition.findIndex((group) => group.paths.includes(item.to));
    if (index === -1) leftover.items.push(item);
    else buckets[index].items.push(item);
  });

  const groups = buckets.filter((group) => group.items.length > 0);
  if (leftover.items.length > 0) groups.push(leftover);
  return groups;
}

export default function Sidebar({ role }) {
  const { hasPermission, logout } = useAuth();
  const items = navigationFor(role).filter((item) => !item.permission || hasPermission(item.permission));
  const groups = groupItems(role, items);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" />
        </span>
        <span className="sidebar__brand-text">
          <strong className="sidebar__brand-name">Vision Valley</strong>
          <span className="sidebar__brand-chip">{ROLE_LABEL[role]} workspace</span>
        </span>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-group__label">{group.label}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
              >
                <i className={`bi ${item.icon}`} aria-hidden="true" />
                <span className="nav-item__label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__foot">
        <div className="sidebar__help">
          <span className="sidebar__help-head">
            <i className="bi bi-life-preserver" aria-hidden="true" />
            Need help?
          </span>
          <span className="sidebar__help-hours">School office, Mon–Fri 9:00–17:00</span>
          <span className="sidebar__help-phone">+91 20 4000 1234</span>
        </div>

        <button type="button" className="sidebar__signout" onClick={logout}>
          <i className="bi bi-box-arrow-left" aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
