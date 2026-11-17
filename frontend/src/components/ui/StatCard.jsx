import { Link } from 'react-router-dom';

export default function StatCard({ label, value, hint, icon, tone = 'blue', to }) {
  const content = (
    <>
      <span className={`statcard__icon statcard__icon--${tone}`}>
        <i className={`bi ${icon}`} aria-hidden="true" />
      </span>
      <span className="statcard__body">
        <span className="statcard__label">{label}</span>
        <strong className="statcard__value">{value}</strong>
        {hint && <span className="statcard__hint">{hint}</span>}
      </span>
    </>
  );

  if (to) {
    return (
      <Link className={`statcard statcard--${tone}`} to={to}>
        {content}
      </Link>
    );
  }
  return <div className={`statcard statcard--${tone}`}>{content}</div>;
}
