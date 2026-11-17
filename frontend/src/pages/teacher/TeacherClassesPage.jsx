import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';

/**
 * The teacher's own teaching load for the current academic year: which classes, which subjects,
 * how many students, and which sections they are class teacher of. Read-only by design — an admin
 * assigns subjects from the teacher record.
 */
export default function TeacherClassesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    admin
      .getMyClasses()
      .then(setData)
      .catch((requestError) =>
        setError(requestError.response?.data?.error?.message || 'Could not load your classes.'),
      );
  }, []);

  const classes = data?.classes || [];

  return (
    <div className="page">
      <PageHeader
        title="My classes"
        subtitle={data?.academicYear ? `Academic year ${data.academicYear}` : 'Your teaching load for this year.'}
      />
      {error && <Notice kind="error">{error}</Notice>}
      {!data && !error && <p className="empty-state">Loading…</p>}

      {data && !data.teacher && (
        <p className="empty-state">
          No teacher record is linked to this login. Ask the school office to link your profile.
        </p>
      )}

      {data?.teacher && classes.length === 0 && (
        <p className="empty-state">
          You have no classes assigned yet. An admin assigns subjects from your teacher record.
        </p>
      )}

      {classes.length > 0 && (
        <div className="stat-row">
          {classes.map((item) => (
            <section key={item.class_id} className="section-card">
              <div className="section-card__head">
                <h3>{item.class_name}</h3>
                <span className="muted">{item.students} student{item.students === 1 ? '' : 's'}</span>
              </div>
              <p>
                <strong>Subjects:</strong> {item.subjects}
              </p>
              {item.class_teacher_of?.length > 0 ? (
                <p>
                  <strong>Class teacher of:</strong>{' '}
                  {item.class_teacher_of.map((section) => section.name).join(', ')}
                </p>
              ) : (
                <p className="muted">Not a class teacher of this class.</p>
              )}
              <div className="form-actions">
                <Link className="btn btn--ghost btn--sm" to={`/teacher/students?classId=${item.class_id}`}>
                  Students
                </Link>
                <Link className="btn btn--ghost btn--sm" to="/teacher/attendance">
                  Attendance
                </Link>
                <Link className="btn btn--ghost btn--sm" to="/teacher/marks">
                  Marks
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
