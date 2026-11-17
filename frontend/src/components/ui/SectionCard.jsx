import { Link } from 'react-router-dom';

export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`section-card ${className}`}>
      <header className="section-card__head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && (
          <Link className="section-card__action" to={action.to}>
            {action.label}
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
