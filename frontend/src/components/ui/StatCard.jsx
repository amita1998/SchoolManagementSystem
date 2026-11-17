import { Link } from 'react-router-dom';

/**
 * Legacy payloads still ship tones the palette no longer carries; map them onto the
 * semantic tiles defined in ui.css (blue / mint / coral / amber / purple).
 */
const TONE_ALIAS = { pink: 'amber', lavender: 'purple' };

export default function StatCard({ label, value, hint, icon, tone = 'blue', to }) {
  const toneClass = TONE_ALIAS[tone] || tone;

  const content = (
    <>
      {icon && (
        <span className={`statcard__icon statcard__icon--${toneClass}`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
        </span>
      )}
      <span className="statcard__body">
        <span className="statcard__label">{label}</span>
        <strong className="statcard__value">{value}</strong>
        {hint && <span className="statcard__hint">{hint}</span>}
      </span>
    </>
  );

  if (to) {
    return (
      <Link className="statcard" to={to}>
        {content}
      </Link>
    );
  }
  return <div className="statcard">{content}</div>;
}
