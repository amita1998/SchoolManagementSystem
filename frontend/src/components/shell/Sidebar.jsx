import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { navigationFor } from '../../config/navigation.js';
import { ROLE_LABEL } from '../../routes/roles.js';

export default function Sidebar({ role }) {
  const { hasPermission, logout } = useAuth();
  const items = navigationFor(role).filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand-mark brand-mark--sm">
          <i className="bi bi-mortarboard-fill" aria-hidden="true" />
        </span>
        <span className="sidebar__brand-text">
          <strong>Vision Valley</strong>
          <span>{ROLE_LABEL[role]} workspace</span>
        </span>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__help">
        <span className="sidebar__help-icon">
          <i className="bi bi-life-preserver" aria-hidden="true" />
        </span>
        <strong>Need help?</strong>
        <span>School office, 9:00–17:00</span>
        <span className="sidebar__help-phone">+91 20 4000 1234</span>
      </div>

      <button type="button" className="sidebar__signout" onClick={logout}>
        <i className="bi bi-box-arrow-left" aria-hidden="true" />
        Sign out
      </button>
    </aside>
  );
}
