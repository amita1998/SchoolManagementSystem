import { Link } from 'react-router-dom';

const DD_MM_YYYY = /^(\d{2})-(\d{2})-(\d{4})$/;

/** The payload sends the day as DD-MM-YYYY; show it the way a reader expects. */
function readableDate(value) {
  const match = DD_MM_YYYY.exec(value || '');
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Restrained intro card for every dashboard: eyebrow (the greeting), the person's
 * name, one line of context, the day as a chip, and the single primary action.
 * `facts` is optional and takes [{ value, label }] straight from the payload.
 */
export default function WelcomeBanner({ greeting, name, subtitle, cta, meta, facts = [] }) {
  const eyebrow = (greeting || '').replace(/,\s*$/, '');

  return (
    <section className="section-card">
      <div className="page-head">
        <div className="page-head__text">
          {eyebrow && <span className="statcard__label">{eyebrow}</span>}
          <h1>{name}</h1>
          {subtitle && <p>{subtitle}</p>}
          {meta && (
            <div className="summary-chips">
              <span className="summary-chip">
                <i className="bi bi-calendar3" aria-hidden="true" />
                {readableDate(meta)}
              </span>
            </div>
          )}
        </div>

        {(cta || facts.length > 0) && (
          <div className="page-head__actions">
            {facts.map((fact, index) => (
              <span className="summary-chip" key={`${fact.label}-${index}`}>
                {fact.value !== undefined && <strong>{fact.value}</strong>}
                {fact.label}
              </span>
            ))}
            {cta && (
              <Link className="btn-primary" to={cta.to}>
                {cta.label}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
