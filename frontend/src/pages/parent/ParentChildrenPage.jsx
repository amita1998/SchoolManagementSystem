import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';

/** Every child linked to this parent account, with the screens that show their data. */
export default function ParentChildrenPage() {
  const [children, setChildren] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/parent')
      .then(({ data: payload }) => setChildren(payload.data.children || []))
      .catch(() => setError('Could not load your children.'));
  }, []);

  return (
    <div className="page">
      <PageHeader title="My children" subtitle="Attendance, results, fees and homework for each child." />
      {error && <Notice kind="error">{error}</Notice>}
      {!children && !error && <p className="empty-state">Loading…</p>}

      {children && children.length === 0 && (
        <p className="empty-state">No child is linked to this account. Ask the school office to link one.</p>
      )}

      {children && children.length > 0 && (
        <div className="stat-row">
          {children.map((child) => (
            <section key={child.id} className="section-card">
              <div className="section-card__head">
                <h3>{child.name}</h3>
                <span className="muted">{child.admissionId}</span>
              </div>
              <p>
                <strong>Class:</strong> {child.className || '—'}
                {child.section ? ` · Section ${child.section}` : ''}
              </p>
              <div className="form-actions">
                <Link className="btn btn--ghost btn--sm" to="/parent/attendance">
                  Attendance
                </Link>
                <Link className="btn btn--ghost btn--sm" to="/parent/results">
                  Results
                </Link>
                <Link className="btn btn--ghost btn--sm" to="/parent/fees">
                  Fees
                </Link>
                <Link className="btn btn--ghost btn--sm" to="/parent/assignments">
                  Assignments
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
