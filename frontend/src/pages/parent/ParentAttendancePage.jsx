import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as attendanceApi from '../../services/attendance.js';
import { PageHeader, Notice } from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { AttendanceSummary } from '../student/StudentAttendancePage.jsx';

export default function ParentAttendancePage() {
  const [children, setChildren] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [childId, setChildId] = useState('');
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard/parent')
      .then(({ data: payload }) => {
        const kids = payload.data.children || [];
        setChildren(kids);
        if (kids.length) setChildId(String(kids[0].id));
      })
      .catch(() => setError('Could not load your children.'))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!childId) return;
    Promise.all([
      attendanceApi.summary(childId),
      api.get('/attendance', { params: { limit: 10 } }),
    ])
      .then(([summaryData, listResponse]) => {
        setData(summaryData);
        setRecent(
          listResponse.data.data.rows.filter((row) => String(row.student_id) === String(childId)),
        );
      })
      .catch((requestError) =>
        setError(requestError.response?.data?.error?.message || 'Could not load attendance.'),
      );
  }, [childId]);

  if (error) {
    return (
      <div className="page">
        <PageHeader title="Attendance" subtitle="Your child's attendance for this academic year." />
        <Notice kind="error">{error}</Notice>
      </div>
    );
  }

  if (loaded && children.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Attendance" subtitle="Your child's attendance for this academic year." />
        <section className="section-card">
          <EmptyState
            icon="bi-person-plus"
            title="No child linked to this account"
            text="Ask the school office to link your child's record to this login, then their attendance appears here."
          />
        </section>
      </div>
    );
  }

  const child = children.find((item) => String(item.id) === String(childId));

  const switcher = children.length > 1 ? (
    <div className="child-switcher" role="tablist" aria-label="Select child">
      {children.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={String(item.id) === String(childId)}
          className={`child-chip ${String(item.id) === String(childId) ? 'is-active' : ''}`}
          onClick={() => setChildId(String(item.id))}
        >
          <span className="child-chip__avatar">{item.name.charAt(0)}</span>
          <span>
            <strong>{item.name}</strong>
            <small>{item.className} {item.section}</small>
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <AttendanceSummary
      summary={data?.summary}
      months={data?.months || []}
      recent={recent}
      title={child ? `${child.name} · Attendance` : 'Attendance'}
      subtitle={
        child
          ? `${child.className || '—'} ${child.section || ''} · ${child.admissionId}. Present and late count as full days; a half day counts as 0.5.`
          : undefined
      }
      childSwitcher={switcher}
    />
  );
}
