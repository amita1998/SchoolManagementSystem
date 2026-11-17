import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/** Every child linked to this parent account, with the screens that show their data. */
export default function ParentChildrenPage() {
  const [children, setChildren] = useState(null);
  const [guardianName, setGuardianName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/parent')
      .then(({ data: payload }) => {
        setChildren(payload.data.children || []);
        setGuardianName(payload.data.shell?.user?.name || '');
      })
      .catch(() => setError('Could not load your children.'));
  }, []);

  return (
    <div className="page">
      <PageHeader title="My children" subtitle="Attendance, results, fees and homework for each child." />
      {error && <Notice kind="error">{error}</Notice>}

      {!children && !error && (
        <div className="loading-block" aria-hidden="true">
          <div className="skeleton-row">
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
          </div>
        </div>
      )}

      {children && children.length === 0 && (
        <section className="section-card">
          <EmptyState
            icon="bi-person-plus"
            title="No child linked to this account"
            text="Ask the school office to link your child's record to this login, then their data appears here."
          />
        </section>
      )}

      {children && children.length > 0 && (
        <div className="dash__grid">
          {children.map((child) => (
            <section key={child.id} className="section-card">
              <div className="section-card__head">
                <div>
                  <h3>{child.name}</h3>
                  <span className="muted">{child.admissionId}</span>
                </div>
                <span className="summary-chip">
                  {child.className || '—'} {child.section || ''}
                </span>
              </div>

              <dl className="profile-facts">
                <div>
                  <dt>Class</dt>
                  <dd>{child.className || '—'}</dd>
                </div>
                <div>
                  <dt>Section</dt>
                  <dd>{child.section || '—'}</dd>
                </div>
                <div>
                  <dt>Admission ID</dt>
                  <dd className="mono">{child.admissionId}</dd>
                </div>
                <div>
                  <dt>Guardian account</dt>
                  <dd>{guardianName || 'This login'}</dd>
                </div>
              </dl>

              <div className="quick-actions mt-20">
                <Link className="quick-action" to="/parent/attendance">
                  <i className="bi bi-calendar2-check" aria-hidden="true" />
                  <span>Attendance</span>
                </Link>
                <Link className="quick-action" to="/parent/results">
                  <i className="bi bi-award" aria-hidden="true" />
                  <span>Results</span>
                </Link>
                <Link className="quick-action" to="/parent/fees">
                  <i className="bi bi-receipt" aria-hidden="true" />
                  <span>Fees</span>
                </Link>
                <Link className="quick-action" to="/parent/assignments">
                  <i className="bi bi-journal-text" aria-hidden="true" />
                  <span>Assignments</span>
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
