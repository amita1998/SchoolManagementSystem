import { Link } from 'react-router-dom';

export default function EmptyState({ icon = 'bi-inbox', title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action && (
        <Link className="empty-state__action" to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
