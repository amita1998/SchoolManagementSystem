import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationFor } from '../config/navigation.js';

/**
 * Honest placeholder for modules scheduled in a later step. It names the module and
 * the step instead of rendering an empty screen or, worse, fake numbers.
 */
export default function ComingSoon() {
  const location = useLocation();
  const { user } = useAuth();
  const items = navigationFor(user?.role || 'admin');
  const match = items
    .filter((item) => item.to !== `/${user?.role}`)
    .find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="section-card coming-soon">
      <span className="coming-soon__icon">
        <i className={`bi ${match?.icon || 'bi-tools'}`} aria-hidden="true" />
      </span>
      <h2>{match?.label || 'This section'} is not built yet</h2>
      <p>
        {match?.step
          ? `This module is scheduled for Step ${match.step} of the build order.`
          : 'This module is scheduled for a later step.'}{' '}
        The dashboard already reads live data; the module screens arrive with their own step.
      </p>
      <a className="coming-soon__back" href={`/${user?.role || ''}`}>
        Back to dashboard
      </a>
    </div>
  );
}
