import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as admin from '../../services/admin.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import StatCard from '../../components/ui/StatCard.jsx';

/** "Information Technology, Physics" -> ["Information Technology", "Physics"] for the chips. */
function subjectsOf(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function LoadingBlock() {
  return (
    <div className="loading-block" aria-hidden="true">
      <div className="skeleton skeleton--banner" />
      <div className="skeleton-row">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}

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
  const totalStudents = classes.reduce((sum, item) => sum + Number(item.students || 0), 0);
  const sectionsLed = classes.reduce((sum, item) => sum + (item.class_teacher_of?.length || 0), 0);

  return (
    <div className="page">
      <PageHeader
        title="My classes"
        subtitle={data?.academicYear ? `Academic year ${data.academicYear}` : 'Your teaching load for this year.'}
      />
      {error && <Notice kind="error">{error}</Notice>}

      {!data && !error && <LoadingBlock />}

      {data && !data.teacher && (
        <section className="section-card">
          <EmptyState
            icon="bi-person-badge"
            title="No teacher record linked"
            text="Ask the school office to link your login to your teacher record before classes appear here."
          />
        </section>
      )}

      {data?.teacher && classes.length === 0 && (
        <section className="section-card">
          <EmptyState
            icon="bi-easel"
            title="No classes assigned yet"
            text="An admin assigns subjects and sections from your teacher record. They appear here for the current academic year."
          />
        </section>
      )}

      {classes.length > 0 && (
        <>
          <div className="stat-grid stat-grid--three">
            <StatCard
              label="Classes"
              value={classes.length}
              hint={data?.academicYear ? `Academic year ${data.academicYear}` : 'This academic year'}
              icon="bi-building"
              tone="blue"
            />
            <StatCard
              label="Students taught"
              value={totalStudents}
              hint="Across all your classes"
              icon="bi-people"
              tone="mint"
            />
            <StatCard
              label="Class teacher of"
              value={sectionsLed}
              hint={sectionsLed === 1 ? '1 section' : `${sectionsLed} sections`}
              icon="bi-person-check"
              tone="purple"
            />
          </div>

          <div className={classes.length > 1 ? 'dash__grid' : 'dash'}>
            {classes.map((item) => {
              const subjects = subjectsOf(item.subjects);
              const sections = item.class_teacher_of || [];
              return (
                <section key={item.class_id} className="section-card">
                  <div className="section-card__head">
                    <div>
                      <h3>{item.class_name}</h3>
                      <span className="muted">
                        {item.students} student{item.students === 1 ? '' : 's'} · {subjects.length}{' '}
                        subject{subjects.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {sections.length > 0 ? (
                      <span className="status-badge status-badge--mint">Class teacher</span>
                    ) : (
                      <span className="status-badge status-badge--blue">Subject teacher</span>
                    )}
                  </div>

                  <div className="section-card__body">
                    <div>
                      <p className="section-card__stat">Subjects taught</p>
                      <div className="summary-chips">
                        {subjects.length === 0 ? (
                          <span className="summary-chip">No subject assigned</span>
                        ) : (
                          subjects.map((subject) => (
                            <span key={subject} className="summary-chip">
                              {subject}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <dl className="profile-facts">
                      <div>
                        <dt>Student strength</dt>
                        <dd>{item.students}</dd>
                      </div>
                      <div>
                        <dt>Class teacher of</dt>
                        <dd>
                          {sections.length > 0
                            ? sections.map((section) => `Section ${section.name}`).join(', ')
                            : 'Not a class teacher here'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="quick-actions mt-20">
                    <Link className="quick-action" to={`/teacher/students?classId=${item.class_id}`}>
                      <i className="bi bi-people" aria-hidden="true" />
                      <span>Students</span>
                    </Link>
                    <Link className="quick-action" to="/teacher/attendance">
                      <i className="bi bi-calendar2-check" aria-hidden="true" />
                      <span>Attendance</span>
                    </Link>
                    <Link className="quick-action" to="/teacher/marks">
                      <i className="bi bi-journal-check" aria-hidden="true" />
                      <span>Marks</span>
                    </Link>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
