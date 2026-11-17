import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import * as attendanceApi from '../../services/attendance.js';
import { Notice } from '../../components/ui/PageHeader.jsx';
import { AttendanceSummary } from '../student/StudentAttendancePage.jsx';

export default function ParentAttendancePage() {
  const [children, setChildren] = useState([]);
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
      .catch(() => setError('Could not load your children.'));
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

  if (error) return <Notice kind="error">{error}</Notice>;

  const child = children.find((item) => String(item.id) === String(childId));

  return (
    <>
      {children.length > 1 && (
        <div className="child-switcher page" style={{ paddingBottom: 0 }}>
          {children.map((item) => (
            <button
              key={item.id}
              type="button"
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
      )}
      <AttendanceSummary
        summary={data?.summary}
        months={data?.months || []}
        recent={recent}
        title={child ? `${child.name} · attendance` : 'Attendance'}
      />
    </>
  );
}
