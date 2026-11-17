import { Link } from 'react-router-dom';

export default function QuickActions({ actions = [] }) {
  if (!actions.length) return null;
  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {actions.map((action) => (
        <Link key={action.label} className="quick-action" to={action.to}>
          <i className={`bi ${action.icon}`} aria-hidden="true" />
          <span>{action.label}</span>
        </Link>
      ))}
    </nav>
  );
}
