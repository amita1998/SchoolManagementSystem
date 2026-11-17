import { Link } from 'react-router-dom';

export default function WelcomeBanner({ greeting, name, subtitle, cta, meta }) {
  return (
    <section className="welcome">
      <div className="welcome__text">
        <span className="welcome__greeting">{greeting}</span>
        <h1>{name}</h1>
        <p>{subtitle}</p>
        {meta && <span className="welcome__meta">{meta}</span>}
        {cta && (
          <Link className="welcome__cta" to={cta.to}>
            {cta.label}
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="welcome__art" aria-hidden="true">
        <span className="welcome__book welcome__book--1" />
        <span className="welcome__book welcome__book--2" />
        <span className="welcome__book welcome__book--3" />
        <span className="welcome__book welcome__book--4" />
      </div>
    </section>
  );
}
